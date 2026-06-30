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

      {/* Mobile : bottom sheet — Desktop : dialog centré */}
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
        <div
          className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
            animation: 'dialogIn 0.25s cubic-bezier(0.32,0.72,0,1)',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Handle mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
          </div>

          <div className="px-5 pt-4 sm:pt-5 pb-3 flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: state.danger ? 'rgba(239,68,68,0.12)' : 'rgba(123,63,242,0.12)' }}
            >
              {state.danger
                ? <AlertTriangle size={20} style={{ color: '#EF4444' }} />
                : <Info size={20} style={{ color: '#7B3FF2' }} />}
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
                background: state.danger
                  ? 'linear-gradient(135deg,#EF4444,#DC2626)'
                  : 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
                boxShadow: state.danger
                  ? '0 4px 14px rgba(239,68,68,0.35)'
                  : '0 4px 14px rgba(123,63,242,0.35)',
              }}
            >
              {state.confirmLabel ?? 'Confirmer'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dialogIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 640px) {
          @keyframes dialogIn {
            from { opacity: 0; transform: scale(0.94) translateY(6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        }
      `}</style>
    </>
  ) : null;

  return { confirm, ConfirmDialog };
}
