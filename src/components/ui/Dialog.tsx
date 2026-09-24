/**
 * useConfirm — remplace window.confirm par une dialog React accessible.
 * Pour les notifications, utiliser react-hot-toast directement.
 *
 * Usage :
 *   const { confirm, ConfirmDialog } = useConfirm()
 *   const ok = await confirm({ title: 'Supprimer ?', message: '...', danger: true })
 *   if (!ok) return
 *   // ... action
 *   return <>{ConfirmDialog}</>
 */
import { useState, useCallback } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => setState({ ...opts, resolve }));
  }, []);

  function answer(v: boolean) {
    state?.resolve(v);
    setState(null);
  }

  const ConfirmDialog = state ? (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={() => answer(false)}
      />

      {/* Bottom sheet partout — même présentation sur mobile et desktop,
          une seule identité pour ce composant dans toute l'app. Toute la
          largeur de l'écran (pas de barre étroite flottante sur un grand
          moniteur) ; le contenu lui reste centré et lisible. */}
      <div className="fixed inset-0 z-[9999] flex items-end justify-center">
        <div
          className="w-full rounded-t-3xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
            animation: 'dialogIn 0.25s cubic-bezier(0.32,0.72,0,1)',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
          </div>

          <div className="max-w-sm mx-auto">
            <div className="px-5 pt-4 pb-3 flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: state.danger ? 'rgba(239,68,68,0.12)' : 'rgba(123,63,242,0.12)' }}
              >
                {state.danger
                  ? <AlertTriangle size={20} style={{ color: '#EF4444' }} />
                  : <Info size={20} style={{ color: 'var(--primary)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
                  {state.title}
                </p>
                {state.message && (
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {state.message}
                  </p>
                )}
              </div>
              <button onClick={() => answer(false)} className="shrink-0 mt-0.5 p-1" style={{ color: 'var(--text-tertiary)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-3 px-5 pb-2 pt-2">
              <button
                onClick={() => answer(false)}
                className="flex-1 h-12 rounded-2xl text-sm font-bold border transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
              >
                {state.cancelLabel ?? 'Annuler'}
              </button>
              <button
                onClick={() => answer(true)}
                className="flex-1 h-12 rounded-2xl text-sm font-bold text-white transition-all"
                style={{
                  background: state.danger ? '#EF4444' : 'var(--primary)',
                }}
              >
                {state.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dialogIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  ) : null;

  return { confirm, ConfirmDialog };
}
