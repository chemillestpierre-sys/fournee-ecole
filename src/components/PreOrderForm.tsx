import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Minus, Plus, RotateCcw } from 'lucide-react';
import {
  EMAIL_REGEX,
  formatCurrencyEur,
  isPreOrderOpen,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_QUANTITY,
  MIN_QUANTITY,
  PreOrder,
  UNIT_PRICE_EUR,
} from '../types/order';
import { submitParentPreOrder } from '../services/orderService';

interface PreOrderFormProps {
  onOrderCreated?: (order: PreOrder) => void;
}

const QUICK_QUANTITIES = [1, 2, 4, 6, 10];

export function PreOrderForm({ onOrderCreated }: PreOrderFormProps) {
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [quantity, setQuantity] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<PreOrder | null>(null);

  const open = isPreOrderOpen();
  const totalAmount = quantity * UNIT_PRICE_EUR;

  const handleQuantityChange = (nextValue: number) => {
    if (Number.isNaN(nextValue)) {
      setQuantity(MIN_QUANTITY);
      return;
    }
    const clamped = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.floor(nextValue)));
    setQuantity(clamped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!open) {
      setErrorMessage('Les précommandes sont clôturées depuis le 16 décembre.');
      return;
    }

    const first = childFirstName.trim();
    const last = childLastName.trim();
    const email = parentEmail.trim().toLowerCase();

    if (!first) {
      setErrorMessage("Veuillez renseigner le prénom de l'enfant.");
      return;
    }
    if (!last) {
      setErrorMessage("Veuillez renseigner le nom de l'enfant.");
      return;
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      setErrorMessage("Veuillez saisir une adresse e-mail de parent valide.");
      return;
    }
    if (quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
      setErrorMessage(`Veuillez choisir entre ${MIN_QUANTITY} et ${MAX_QUANTITY} pains au chocolat.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { order } = await submitParentPreOrder({
        childFirstName: first,
        childLastName: last,
        parentEmail: email,
        quantity,
      });
      setConfirmedOrder(order);
      onOrderCreated?.(order);
    } catch (err) {
      if (err instanceof Error && err.message.includes('permission')) {
        setErrorMessage(
          "Impossible d'enregistrer la commande pour le moment. Vérifiez que la date limite n'est pas dépassée."
        );
      } else {
        setErrorMessage(
          err instanceof Error && !err.message.startsWith('{')
            ? err.message
            : "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setConfirmedOrder(null);
    setChildFirstName('');
    setChildLastName('');
    setParentEmail('');
    setQuantity(2);
    setErrorMessage(null);
  };

  if (!open) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-start gap-3 text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-800" />
          <div>
            <h3 className="font-display text-lg font-semibold text-stone-900">
              Précommandes clôturées
            </h3>
            <p className="mt-1 text-sm text-stone-700 leading-relaxed">
              La date limite du 16 décembre est passée. La commande globale a été transmise à notre
              boulanger. Merci à toutes les familles pour leur participation aux projets scolaires.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (confirmedOrder) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-start gap-3 pb-6 border-b border-stone-200">
          <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-emerald-800">
              Précommande enregistrée · Réf. {confirmedOrder.id.slice(0, 8).toUpperCase()}
            </p>
            <h3 className="font-display text-2xl font-semibold text-stone-900 mt-1">
              Merci pour votre participation
            </h3>
            <p className="text-sm text-stone-600 mt-1">
              Votre commande a bien été comptabilisée pour le passage en boulangerie.
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-100">
            <dt className="text-stone-500">Enfant</dt>
            <dd className="font-semibold text-stone-900 text-right">
              {confirmedOrder.childFirstName} {confirmedOrder.childLastName}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-100">
            <dt className="text-stone-500">E-mail du parent</dt>
            <dd className="font-medium text-stone-900 text-right break-all">
              {confirmedOrder.parentEmail}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-100">
            <dt className="text-stone-500">Quantité commandée</dt>
            <dd className="font-semibold text-stone-900 tabular-nums">
              {confirmedOrder.quantity} pain{confirmedOrder.quantity > 1 ? 's' : ''} au chocolat
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-stone-500">Montant total dû</dt>
            <dd className="text-lg font-bold text-amber-900 tabular-nums">
              {formatCurrencyEur(confirmedOrder.totalAmount)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-stone-500 leading-relaxed">
            Statut actuel : En attente de règlement. Le paiement s&apos;effectue auprès de
            l&apos;école selon les modalités habituelles.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Autre commande</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8"
    >
      <div className="pb-6 border-b border-stone-200">
        <h3 className="font-display text-2xl font-semibold text-stone-900">
          Formulaire de précommande
        </h3>
        <p className="mt-1.5 text-sm text-stone-600">
          Renseignez les coordonnées de votre enfant et le nombre de pains au chocolat souhaité.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 p-3.5 text-sm text-red-900 bg-red-50 border border-red-200 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="childFirstName"
              className="block text-sm font-medium text-stone-800 mb-1.5"
            >
              Prénom de l&apos;enfant
            </label>
            <input
              id="childFirstName"
              name="childFirstName"
              type="text"
              required
              maxLength={MAX_NAME_LENGTH}
              value={childFirstName}
              onChange={(e) => setChildFirstName(e.target.value)}
              placeholder="Ex. Camille"
              autoComplete="given-name"
              className="w-full h-11 px-3.5 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg placeholder:text-stone-400 focus:outline-none focus:border-amber-800 focus:ring-2 focus:ring-amber-800/15 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="childLastName"
              className="block text-sm font-medium text-stone-800 mb-1.5"
            >
              Nom de l&apos;enfant
            </label>
            <input
              id="childLastName"
              name="childLastName"
              type="text"
              required
              maxLength={MAX_NAME_LENGTH}
              value={childLastName}
              onChange={(e) => setChildLastName(e.target.value)}
              placeholder="Ex. Martin"
              autoComplete="family-name"
              className="w-full h-11 px-3.5 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg placeholder:text-stone-400 focus:outline-none focus:border-amber-800 focus:ring-2 focus:ring-amber-800/15 transition-colors"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="parentEmail"
            className="block text-sm font-medium text-stone-800 mb-1.5"
          >
            Adresse e-mail du parent
          </label>
          <input
            id="parentEmail"
            name="parentEmail"
            type="email"
            required
            maxLength={MAX_EMAIL_LENGTH}
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@exemple.fr"
            autoComplete="email"
            className="w-full h-11 px-3.5 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg placeholder:text-stone-400 focus:outline-none focus:border-amber-800 focus:ring-2 focus:ring-amber-800/15 transition-colors"
          />
          <p className="mt-1.5 text-xs text-stone-500">
            Utilisée uniquement par l&apos;équipe de l&apos;école pour le suivi de votre commande.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="quantity" className="block text-sm font-medium text-stone-800">
              Nombre de pains au chocolat
            </label>
            <span className="text-xs text-stone-500 tabular-nums">1 € l&apos;unité · max 50</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden">
              <button
                type="button"
                aria-label="Diminuer la quantité"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= MIN_QUANTITY}
                className="w-11 h-11 flex items-center justify-center text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min={MIN_QUANTITY}
                max={MAX_QUANTITY}
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
                className="w-16 h-11 text-center text-base font-semibold text-stone-900 tabular-nums border-x border-stone-200 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Augmenter la quantité"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= MAX_QUANTITY}
                className="w-11 h-11 flex items-center justify-center text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5" aria-label="Choix rapides de quantité">
              {QUICK_QUANTITIES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuantityChange(preset)}
                  className={`h-11 px-3 text-sm font-medium rounded-lg border transition-colors tabular-nums cursor-pointer ${
                    quantity === preset
                      ? 'bg-amber-900 text-white border-amber-900'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-stone-500">Montant total à prévoir</p>
          <p className="text-2xl font-display font-semibold text-stone-900 tabular-nums">
            {formatCurrencyEur(totalAmount)}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-amber-900 hover:bg-amber-950 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
        >
          {isSubmitting
            ? 'Enregistrement en cours…'
            : `Confirmer la précommande (${formatCurrencyEur(totalAmount)})`}
        </button>
      </div>
    </form>
  );
}
