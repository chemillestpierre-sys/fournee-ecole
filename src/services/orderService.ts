import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  CampaignSummary,
  CreateOrderInput,
  EMAIL_REGEX,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_QUANTITY,
  MIN_QUANTITY,
  PaymentStatus,
  PreOrder,
  UNIT_PRICE_EUR,
} from '../types/order';

function generateValidOrderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toDateOrNull(val: unknown): Date | null {
  if (val instanceof Timestamp) {
    return val.toDate();
  }
  return null;
}

export function sanitizeOrderInput(input: CreateOrderInput): CreateOrderInput {
  const childFirstName = input.childFirstName.trim().slice(0, MAX_NAME_LENGTH);
  const childLastName = input.childLastName.trim().slice(0, MAX_NAME_LENGTH);
  const parentEmail = input.parentEmail.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
  const quantity = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.floor(Number(input.quantity))));

  if (!childFirstName || childFirstName.length > MAX_NAME_LENGTH) {
    throw new Error("Veuillez saisir le prénom de l'enfant.");
  }
  if (!childLastName || childLastName.length > MAX_NAME_LENGTH) {
    throw new Error("Veuillez saisir le nom de l'enfant.");
  }
  if (!parentEmail || parentEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(parentEmail)) {
    throw new Error("Veuillez saisir une adresse e-mail de parent valide.");
  }
  if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    throw new Error(`Le nombre de pains au chocolat doit être compris entre ${MIN_QUANTITY} et ${MAX_QUANTITY}.`);
  }

  return { childFirstName, childLastName, parentEmail, quantity };
}

export async function submitParentPreOrder(
  rawInput: CreateOrderInput,
  options?: { paymentStatus?: PaymentStatus; distributed?: boolean }
): Promise<{ orderId: string; order: PreOrder }> {
  const clean = sanitizeOrderInput(rawInput);
  const orderId = generateValidOrderId();
  const orderRef = doc(db, 'orders', orderId);
  const summaryRef = doc(db, 'campaign', 'summary');
  const totalAmount = clean.quantity * UNIT_PRICE_EUR;
  const paymentStatus: PaymentStatus = options?.paymentStatus ?? 'pending';
  const distributed = options?.distributed ?? false;

  try {
    await runTransaction(db, async (transaction) => {
      const summarySnap = await transaction.get(summaryRef);
      const prevPastries = summarySnap.exists() ? Number(summarySnap.data().totalPastries || 0) : 0;
      const prevOrders = summarySnap.exists() ? Number(summarySnap.data().totalOrders || 0) : 0;

      transaction.set(orderRef, {
        childFirstName: clean.childFirstName,
        childLastName: clean.childLastName,
        parentEmail: clean.parentEmail,
        quantity: clean.quantity,
        unitPrice: UNIT_PRICE_EUR,
        totalAmount,
        paymentStatus,
        distributed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      transaction.set(summaryRef, {
        totalPastries: prevPastries + clean.quantity,
        totalOrders: prevOrders + 1,
        lastOrderId: orderId,
        updatedAt: serverTimestamp(),
      });
    });

    return {
      orderId,
      order: {
        id: orderId,
        ...clean,
        unitPrice: UNIT_PRICE_EUR,
        totalAmount,
        paymentStatus,
        distributed,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

export function subscribeCampaignSummary(
  onData: (summary: CampaignSummary | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const summaryRef = doc(db, 'campaign', 'summary');
  return onSnapshot(
    summaryRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({
          totalPastries: 0,
          totalOrders: 0,
          lastOrderId: '',
          updatedAt: null,
        });
        return;
      }
      const data = snapshot.data();
      onData({
        totalPastries: Number(data.totalPastries || 0),
        totalOrders: Number(data.totalOrders || 0),
        lastOrderId: String(data.lastOrderId || ''),
        updatedAt: toDateOrNull(data.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'campaign/summary');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export function subscribeAllOrders(
  onData: (orders: PreOrder[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const list: PreOrder[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          childFirstName: String(d.childFirstName || ''),
          childLastName: String(d.childLastName || ''),
          parentEmail: String(d.parentEmail || ''),
          quantity: Number(d.quantity || 0),
          unitPrice: Number(d.unitPrice || UNIT_PRICE_EUR),
          totalAmount: Number(d.totalAmount || 0),
          paymentStatus: d.paymentStatus === 'paid' ? 'paid' : 'pending',
          distributed: Boolean(d.distributed),
          createdAt: toDateOrNull(d.createdAt),
          updatedAt: toDateOrNull(d.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function updateOrderFlags(
  orderId: string,
  updates: { paymentStatus?: PaymentStatus; distributed?: boolean }
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  try {
    await updateDoc(orderRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
  }
}

export async function deleteOrderAndSyncSummary(orderId: string, quantity: number): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  const summaryRef = doc(db, 'campaign', 'summary');

  try {
    await runTransaction(db, async (transaction) => {
      const summarySnap = await transaction.get(summaryRef);
      transaction.delete(orderRef);

      if (summarySnap.exists()) {
        const prevPastries = Number(summarySnap.data().totalPastries || 0);
        const prevOrders = Number(summarySnap.data().totalOrders || 0);
        const prevLastOrderId = String(summarySnap.data().lastOrderId || 'deleted');
        transaction.update(summaryRef, {
          totalPastries: Math.max(0, prevPastries - quantity),
          totalOrders: Math.max(0, prevOrders - 1),
          lastOrderId: prevLastOrderId === orderId ? 'reconciled' : prevLastOrderId,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
  }
}
