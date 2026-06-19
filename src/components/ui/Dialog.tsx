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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="w-full max-w-xs rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            animation: 'dialogIn 0.2s ease-out',
          }}
        >
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: state.danger ? 'rgba(239,68,68,0.12)' : 'rgba(123,63,242,0.12)' }}
            >
              {state.danger
                ? <AlertTriangle size={18} style={{ color: '#EF4444' }} />
                : <Info size={18} style={{ color: '#7B3FF2' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                {state.title}
              </p>
              {state.message && (
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {state.message}
                </p>
              )}
            </div>
            <button onClick={() => answer(false)} className="shrink-0 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              <X size={15} />
            </button>
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <button
              onClick={() => answer(false)}
              className="flex-1 h-10 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
            >
              {state.cancelLabel ?? 'Annuler'}
            </button>
            <button
              onClick={() => answer(true)}
              className="flex-1 h-10 rounded-xl text-sm font-bold text-white transition-all"
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
          from { opacity: 0; transform: scale(0.93) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </>
  ) : null;

  return { confirm, ConfirmDialog };
}
