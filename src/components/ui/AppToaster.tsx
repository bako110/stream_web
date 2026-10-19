/**
 * AppToaster — rendu des notifications (react-hot-toast) identique au Toast mobile :
 * carte avec barre colorée à gauche, pastille d'icône, titre (Succès / Erreur…)
 * et message en dessous. Tous les `toast.success/error(...)` de l'app en héritent
 * sans modification des appels.
 */
import { Toaster, ToastBar, resolveValue, toast as hotToast, type Toast } from 'react-hot-toast';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';

type Kind = 'success' | 'error' | 'info' | 'loading';

const META: Record<Kind, { color: string; bg: string; title: string }> = {
  success: { color: '#22C55E', bg: 'rgba(34,197,94,0.14)',  title: 'Succès' },
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.14)',  title: 'Erreur' },
  info:    { color: '#7B3FF2', bg: 'rgba(123,63,242,0.14)', title: 'Information' },
  loading: { color: '#7B3FF2', bg: 'rgba(123,63,242,0.14)', title: 'Veuillez patienter' },
};

function kindOf(t: Toast): Kind {
  return t.type === 'success' || t.type === 'error' || t.type === 'loading' ? t.type : 'info';
}

// Les erreurs renvoyées par le backend/partenaires contiennent parfois du JSON
// brut ou des détails techniques (ex. "CinetPay auth échoué: {"code":2011,…
// Ip is not withlisted}"). On ne les montre jamais telles quelles à l'utilisateur.
const TECHNICAL = /[{}]|"code"|"status"|traceback|exception|not[_ ]allowed|withlisted|whitelist|unauthorized|internal server|errno|stack|undefined|\bnull\b|https?:\/\//i;

function friendlyMessage(raw: unknown, kind: Kind): unknown {
  if (typeof raw !== 'string' || kind !== 'error') return raw;
  if (!TECHNICAL.test(raw) && raw.length <= 160) return raw;
  if (/cinetpay|paiement|payment|stripe|mobile money|orange|moov|wave/i.test(raw)) {
    return 'Le service de paiement est momentanément indisponible. Réessayez plus tard.';
  }
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

function AppToast({ t }: { t: Toast }) {
  // Toast personnalisé (toast.custom) : on respecte le rendu fourni par l'appelant.
  if (t.type === 'custom') {
    return <ToastBar toast={t} />;
  }
  const kind = kindOf(t);
  const { color, bg, title } = META[kind];
  const Icon = kind === 'success' ? CheckCircle : kind === 'error' ? XCircle : kind === 'loading' ? Loader2 : Info;

  return (
    <div
      onClick={() => hotToast.dismiss(t.id)}
      role={kind === 'error' ? 'alert' : 'status'}
      className="flex items-center gap-2.5 overflow-hidden cursor-pointer"
      style={{
        width: 'min(92vw, 380px)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        paddingRight: 14,
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? 'translateY(0)' : 'translateY(-16px)',
        transition: 'opacity 0.2s, transform 0.25s',
      }}
    >
      <div style={{ width: 4, alignSelf: 'stretch', background: color }} />
      <div className="shrink-0 flex items-center justify-center my-3"
        style={{ width: 36, height: 36, borderRadius: 18, background: bg }}>
        <Icon size={18} style={{ color }} className={kind === 'loading' ? 'animate-spin' : undefined} />
      </div>
      <div className="flex-1 min-w-0 py-3">
        <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs leading-snug mt-0.5 break-words" style={{ color: 'var(--text-secondary)' }}>
          {friendlyMessage(resolveValue(t.message, t), kind) as ReactNode}
        </p>
      </div>
    </div>
  );
}

export function AppToaster() {
  return (
    <Toaster position="top-center" containerStyle={{ top: 12 }} toastOptions={{ duration: 3500 }}>
      {t => <AppToast t={t} />}
    </Toaster>
  );
}
