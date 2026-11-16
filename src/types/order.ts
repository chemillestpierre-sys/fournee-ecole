export type PaymentStatus = 'pending' | 'paid';

export interface PreOrder {
  id: string;
  childFirstName: string;
  childLastName: string;
  parentEmail: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  distributed: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CampaignSummary {
  totalPastries: number;
  totalOrders: number;
  lastOrderId: string;
  updatedAt: Date | null;
}

export interface CreateOrderInput {
  childFirstName: string;
  childLastName: string;
  parentEmail: string;
  quantity: number;
}

export const UNIT_PRICE_EUR = 1;
export const MAX_NAME_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 150;
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 50;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DEADLINE_DATE = new Date('2026-12-16T00:00:00Z');
export const ADMIN_EMAIL = 'chemille.stpierre@ec49.fr';

export function isPreOrderOpen(now: Date = new Date()): boolean {
  return now.getTime() < DEADLINE_DATE.getTime();
}

export function formatCurrencyEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
