import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, X, Check, User } from 'lucide-react';
import { useWs } from '../../context/WebSocketContext';
import { battlesApi } from '../../api/battles';
import { Spinner } from '../ui/Spinner';
import { encodeId } from '../../utils/slugId';

interface BattleInvitePayload {
  type: 'battle_invite';
  battle_id: string;
  from_live_id: string;
  from_host_id: string;
  from_name: string;
  from_avatar: string | null;
  timeout_sec: number;
}

export function BattleInviteModal() {
  const { addListener, removeListener } = useWs();
  const navigate = useNavigate();

  const [invite, setInvite]     = useState<BattleInvitePayload | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    const handler = (payload: any) => {
      if (payload.type === 'battle_invite') {
        setInvite(payload as BattleInvitePayload);
      }
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [addListener, removeListener]);

  const close = useCallback(() => setInvite(null), []);

  async function handleRespond(accept: boolean) {
    if (!invite) return;
    setResponding(true);
    try {
      const battle = await battlesApi.respond(invite.battle_id, accept);
      close();
      if (accept && battle.status === 'active') {
        navigate(`/battles/${encodeId(battle.id)}`);
      }
    } catch { close(); } finally { setResponding(false); }
  }

  if (!invite) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/60">
      <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-2.5 text-center" style={{ background: 'var(--surface)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ background: 'rgba(123,63,242,0.13)' }}>
          <Zap size={28} color="#7B3FF2" />
        </div>

        {invite.from_avatar ? (
          <img src={invite.from_avatar} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
            <User size={28} className="text-[var(--text-tertiary)]" />
          </div>
        )}

        <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--text-primary)' }}>Invitation à un battle</p>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-bold">{invite.from_name}</span> vous invite à un battle en direct !
        </p>

        <div className="flex gap-2.5 w-full mt-2">
          <button onClick={() => handleRespond(false)} disabled={responding}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3.5 border-[1.5px] font-bold text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            {responding ? <Spinner size="sm" /> : <><X size={18} /> Refuser</>}
          </button>
          <button onClick={() => handleRespond(true)} disabled={responding}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3.5 font-bold text-sm text-white"
            style={{ background: '#10B981' }}>
            {responding ? <Spinner size="sm" /> : <><Check size={18} /> Accepter</>}
          </button>
        </div>
      </div>
    </div>
  );
}
