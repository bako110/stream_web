import { useState, useMemo } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements, PaymentElement, useStripe, useElements,
} from '@stripe/react-stripe-js';
import { CreditCard } from 'lucide-react';
import { Spinner } from '../ui/Spinner';

let stripePromiseCache: Promise<Stripe | null> | null = null;

/** Charge le SDK Stripe.js une seule fois (mise en cache module-level). */
function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromiseCache) stripePromiseCache = loadStripe(publishableKey);
  return stripePromiseCache;
}

interface Props {
  publishableKey: string;
  clientSecret: string;
  onConfirmed: (paymentIntentId: string) => void;
  onCancel: () => void;
}

/**
 * Formulaire de carte Stripe Elements — inline, pas de redirection. Le
 * paiement est confirmé directement dans la page ; une fois succeeded, le
 * parent appelle POST /wallet/purchase(/custom) avec le payment_intent_id
 * pour créditer le wallet (vérifié serveur avant crédit, cf. stripe_service.py).
 */
export function StripeCardForm({ publishableKey, clientSecret, onConfirmed, onCancel }: Props) {
  const stripePromise = useMemo(() => getStripePromise(publishableKey), [publishableKey]);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
      <CardFormInner onConfirmed={onConfirmed} onCancel={onCancel} />
    </Elements>
  );
}

function CardFormInner({ onConfirmed, onCancel }: { onConfirmed: (id: string) => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Le paiement a échoué.');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onConfirmed(paymentIntent.id);
      return;
    }

    setError(`Paiement non confirmé (statut : ${paymentIntent?.status ?? 'inconnu'}).`);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <PaymentElement />
      </div>

      {error && (
        <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.35)' }}
      >
        {submitting ? <Spinner size="sm" /> : <><CreditCard size={15} /> Payer par carte</>}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="w-full text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Annuler
      </button>
    </form>
  );
}
