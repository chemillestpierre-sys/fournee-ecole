import React, { useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  LogIn,
  LogOut,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  deleteOrderAndSyncSummary,
  submitParentPreOrder,
  subscribeAllOrders,
  updateOrderFlags,
} from '../services/orderService';
import {
  ADMIN_EMAIL,
  EMAIL_REGEX,
  formatCurrencyEur,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_QUANTITY,
  MIN_QUANTITY,
  PaymentStatus,
  PreOrder,
} from '../types/order';
import { exportOrdersToCsv, exportOrdersToPdf } from '../utils/exportRecap';

interface OrganizerRecapViewProps {
  onBack: () => void;
}

type PaymentFilter = 'all' | 'pending' | 'paid';

export function OrganizerRecapView({ onBack }: OrganizerRecapViewProps) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  // Manual entry form state (for cash/paper orders collected directly at school)
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualQty, setManualQty] = useState(2);
  const [manualPaid, setManualPaid] = useState(true);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isAuthorizedAdmin = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  useEffect(() => {
    if (!authReady || !isAuthorizedAdmin) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    setOrdersError(null);
    const unsub = subscribeAllOrders(
      (list) => {
        setOrders(list);
        setLoadingOrders(false);
      },
      () => {
        setLoadingOrders(false);
        setOrdersError(
          "Impossible de charger la liste des précommandes. Vérifiez vos droits d'accès administrateur."
        );
      }
    );

    return () => unsub();
  }, [authReady, isAuthorizedAdmin]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? `Connexion annulée ou impossible (${err.message}).`
          : 'Impossible de se connecter avec Google.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesPayment =
        paymentFilter === 'all' || order.paymentStatus === paymentFilter;
      if (!matchesPayment) return false;
      if (!q) return true;
      const fullName = `${order.childFirstName} ${order.childLastName}`.toLowerCase();
      const reverseName = `${order.childLastName} ${order.childFirstName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        reverseName.includes(q) ||
        order.parentEmail.toLowerCase().includes(q)
      );
    });
  }, [orders, paymentFilter, searchTerm]);

  const stats = useMemo(() => {
    const totalPastries = orders.reduce((sum, o) => sum + o.quantity, 0);
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
    const paidAmount = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingAmount = totalAmount - paidAmount;
    const distributedCount = orders.filter((o) => o.distributed).length;
    return {
      totalPastries,
      totalOrders,
      totalAmount,
      paidAmount,
      pendingAmount,
      paidCount: paidOrders.length,
      distributedCount,
    };
  }, [orders]);

  const handleTogglePayment = async (order: PreOrder) => {
    const nextStatus: PaymentStatus = order.paymentStatus === 'paid' ? 'pending' : 'paid';
    setBusyOrderId(order.id);
    try {
      await updateOrderFlags(order.id, { paymentStatus: nextStatus });
    } catch {
      setOrdersError('Échec de la mise à jour du statut de paiement.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleToggleDistributed = async (order: PreOrder) => {
    setBusyOrderId(order.id);
    try {
      await updateOrderFlags(order.id, { distributed: !order.distributed });
    } catch {
      setOrdersError('Échec de la mise à jour du statut de remise.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleDeleteOrder = async (order: PreOrder) => {
    setBusyOrderId(order.id);
    try {
      await deleteOrderAndSyncSummary(order.id, order.quantity);
      setConfirmDeleteId(null);
    } catch {
      setOrdersError('Impossible de supprimer cette commande.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    const first = manualFirstName.trim();
    const last = manualLastName.trim();
    const email = manualEmail.trim().toLowerCase();
    if (!first || !last) {
      setManualError("Veuillez saisir le prénom et le nom de l'enfant.");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setManualError("Veuillez saisir une adresse e-mail valide.");
      return;
    }
    if (manualQty < MIN_QUANTITY || manualQty > MAX_QUANTITY) {
      setManualError(`La quantité doit être comprise entre ${MIN_QUANTITY} et ${MAX_QUANTITY}.`);
      return;
    }

    setManualSubmitting(true);
    try {
      await submitParentPreOrder(
        {
          childFirstName: first,
          childLastName: last,
          parentEmail: email,
          quantity: manualQty,
        },
        { paymentStatus: manualPaid ? 'paid' : 'pending', distributed: false }
      );
      setManualFirstName('');
      setManualLastName('');
      setManualEmail('');
      setManualQty(2);
      setManualPaid(true);
      setShowAddForm(false);
    } catch (err) {
      setManualError(
        err instanceof Error && !err.message.startsWith('{')
          ? err.message
          : "Impossible d'ajouter cette commande."
      );
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-stone-200">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la page de précommande</span>
          </button>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight">
            Récapitulatif des commandes
          </h1>
          <p className="mt-1.5 text-sm text-stone-600">
            Suivi global pour la commande boulangerie, contrôle des règlements et export CSV / PDF.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3 self-start sm:self-end">
            <span className="text-xs text-stone-600 truncate max-w-[220px]">{user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        )}
      </div>

      {!authReady ? (
        <div className="py-16 text-center text-sm text-stone-500">
          Vérification de la session en cours…
        </div>
      ) : !user ? (
        <div className="mt-10 max-w-lg mx-auto bg-white border border-stone-200 rounded-xl p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-stone-900">
            Accès réservé à l&apos;équipe organisatrice
          </h2>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            Pour protéger les adresses e-mail des parents et les noms des élèves, connectez-vous
            avec le compte Google organisateur ({ADMIN_EMAIL}).
          </p>

          {authError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 text-left text-xs text-red-900 bg-red-50 border border-red-200 rounded-lg p-3"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            className="mt-6 h-11 px-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-amber-900 hover:bg-amber-950 rounded-lg transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Se connecter avec Google</span>
          </button>
        </div>
      ) : !isAuthorizedAdmin ? (
        <div className="mt-10 max-w-lg mx-auto bg-white border border-stone-200 rounded-xl p-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-xl font-semibold text-stone-900">
                Accès non autorisé pour ce compte
              </h2>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Vous êtes connecté avec <strong>{user.email}</strong>. Seul le compte organisateur
                habilité ({ADMIN_EMAIL}) peut consulter et exporter le récapitulatif nominatif des
                précommandes.
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-5 h-10 px-4 inline-flex items-center gap-2 text-sm font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Changer de compte</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5">
              <p className="text-xs font-medium text-amber-900">
                À commander à la boulangerie
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-stone-900 tabular-nums">
                {stats.totalPastries}
              </p>
              <p className="mt-1 text-xs text-stone-600">
                pain{stats.totalPastries > 1 ? 's' : ''} au chocolat au total
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <p className="text-xs font-medium text-stone-500">Précommandes enregistrées</p>
              <p className="mt-2 font-display text-3xl font-semibold text-stone-900 tabular-nums">
                {stats.totalOrders}
              </p>
              <p className="mt-1 text-xs text-stone-600 tabular-nums">
                {stats.distributedCount} remise{stats.distributedCount > 1 ? 's' : ''} effectuée
                {stats.distributedCount > 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <p className="text-xs font-medium text-stone-500">Montant total dû</p>
              <p className="mt-2 font-display text-3xl font-semibold text-stone-900 tabular-nums">
                {formatCurrencyEur(stats.totalAmount)}
              </p>
              <p className="mt-1 text-xs text-stone-600">Pour les projets et sorties scolaires</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <p className="text-xs font-medium text-stone-500">Statut des règlements</p>
              <p className="mt-2 font-display text-3xl font-semibold text-emerald-800 tabular-nums">
                {formatCurrencyEur(stats.paidAmount)}
              </p>
              <p className="mt-1 text-xs text-stone-600 tabular-nums">
                En attente : {formatCurrencyEur(stats.pendingAmount)}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un enfant ou un e-mail…"
                  aria-label="Rechercher dans les commandes"
                  className="w-full h-10 pl-10 pr-3.5 text-sm text-stone-900 bg-stone-50 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-amber-800"
                />
              </div>

              <div
                className="inline-flex items-center p-1 bg-stone-100 rounded-lg self-start"
                role="group"
                aria-label="Filtrer par statut de paiement"
              >
                <button
                  type="button"
                  onClick={() => setPaymentFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    paymentFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Toutes ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('pending')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    paymentFilter === 'pending'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  En attente ({orders.length - stats.paidCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('paid')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    paymentFilter === 'paid'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Réglées ({stats.paidCount})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="h-10 px-3.5 inline-flex items-center gap-2 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Saisie manuelle</span>
              </button>

              <button
                type="button"
                onClick={() => exportOrdersToCsv(filteredOrders)}
                disabled={filteredOrders.length === 0}
                className="h-10 px-3.5 inline-flex items-center gap-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Exporter CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportOrdersToPdf(filteredOrders)}
                disabled={filteredOrders.length === 0}
                className="h-10 px-4 inline-flex items-center gap-2 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-950 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Exporter PDF</span>
              </button>
            </div>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleManualSubmit}
              className="bg-white border border-stone-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-stone-900">
                  Ajouter une précommande manuelle
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  aria-label="Fermer"
                  className="p-1.5 text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {manualError && (
                <div className="flex items-center gap-2 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="Prénom de l'enfant"
                  maxLength={MAX_NAME_LENGTH}
                  value={manualFirstName}
                  onChange={(e) => setManualFirstName(e.target.value)}
                  className="h-10 px-3 text-sm border border-stone-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Nom de l'enfant"
                  maxLength={MAX_NAME_LENGTH}
                  value={manualLastName}
                  onChange={(e) => setManualLastName(e.target.value)}
                  className="h-10 px-3 text-sm border border-stone-300 rounded-lg"
                />
                <input
                  type="email"
                  placeholder="E-mail du parent"
                  maxLength={MAX_EMAIL_LENGTH}
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="h-10 px-3 text-sm border border-stone-300 rounded-lg"
                />
                <input
                  type="number"
                  min={MIN_QUANTITY}
                  max={MAX_QUANTITY}
                  value={manualQty}
                  onChange={(e) =>
                    setManualQty(
                      Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className="h-10 px-3 text-sm border border-stone-300 rounded-lg tabular-nums"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualPaid}
                      onChange={(e) => setManualPaid(e.target.checked)}
                      className="w-4 h-4 accent-amber-900"
                    />
                    <span>Déjà réglée</span>
                  </label>
                  <button
                    type="submit"
                    disabled={manualSubmitting}
                    className="h-10 px-4 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-950 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {manualSubmitting ? 'Ajout…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {ordersError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 p-4 text-sm text-red-900 bg-red-50 border border-red-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{ordersError}</span>
            </div>
          )}

          {/* Detailed Recap Table */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            {loadingOrders ? (
              <div className="p-12 text-center text-sm text-stone-500">
                Chargement des précommandes…
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-display text-lg font-medium text-stone-900">
                  {orders.length === 0
                    ? 'Aucune précommande enregistrée pour le moment'
                    : 'Aucune commande ne correspond à votre filtre'}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {orders.length === 0
                    ? 'Dès qu’un parent remplira le formulaire, sa commande apparaîtra ici en temps réel.'
                    : 'Modifiez votre recherche ou réinitialisez le filtre de paiement.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold text-stone-600">
                      <th className="py-3.5 px-4">Nom de l&apos;enfant</th>
                      <th className="py-3.5 px-4">E-mail du parent</th>
                      <th className="py-3.5 px-4 text-right">Pains au chocolat</th>
                      <th className="py-3.5 px-4 text-right">Montant dû</th>
                      <th className="py-3.5 px-4">Statut du paiement</th>
                      <th className="py-3.5 px-4">Remise</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {filteredOrders.map((order) => {
                      const isBusy = busyOrderId === order.id;
                      const isPaid = order.paymentStatus === 'paid';
                      return (
                        <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-stone-900 whitespace-nowrap">
                            {order.childLastName.toUpperCase()} {order.childFirstName}
                          </td>
                          <td className="py-3.5 px-4 text-stone-600">{order.parentEmail}</td>
                          <td className="py-3.5 px-4 text-right font-semibold text-stone-900 tabular-nums">
                            {order.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-stone-900 tabular-nums">
                            {formatCurrencyEur(order.totalAmount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleTogglePayment(order)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {isPaid ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              <span>{isPaid ? 'Réglée' : 'En attente'}</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleDistributed(order)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                order.distributed
                                  ? 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
                                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              <span>{order.distributed ? 'Remise' : 'À remettre'}</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {confirmDeleteId === order.id ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDeleteOrder(order)}
                                  className="px-2.5 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
                                >
                                  Confirmer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                aria-label={`Supprimer la commande de ${order.childFirstName} ${order.childLastName}`}
                                onClick={() => setConfirmDeleteId(order.id)}
                                className="p-1.5 text-stone-400 hover:text-red-700 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-stone-200 bg-stone-50 font-semibold text-sm text-stone-900">
                      <td className="py-3.5 px-4" colSpan={2}>
                        Total affiché ({filteredOrders.length} commande
                        {filteredOrders.length > 1 ? 's' : ''})
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {filteredOrders.reduce((s, o) => s + o.quantity, 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {formatCurrencyEur(
                          filteredOrders.reduce((s, o) => s + o.totalAmount, 0)
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-normal text-stone-600" colSpan={3}>
                        <button
                          type="button"
                          onClick={() => exportOrdersToCsv(filteredOrders)}
                          className="inline-flex items-center gap-1.5 text-amber-900 hover:underline cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Télécharger ce tableau (CSV)</span>
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
