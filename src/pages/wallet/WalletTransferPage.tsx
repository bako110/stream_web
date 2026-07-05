import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Search, User } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function WalletTransferPage() {
  const navigate = useNavigate();
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<UserResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [recipient,   setRecipient]   = useState<UserResult | null>(null);
  const [amount,      setAmount]      = useState('');
  const [note,        setNote]        = useState('');
  const [transferring,setTransferring]= useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get<any>(`${Endpoints.search.query}?q=${encodeURIComponent(query.trim())}&type=users&limit=8`);
        const list = res.data?.users ?? res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
        setResults(list);
      } catch { toast.error('Recherche échouée.'); }
      finally { setSearching(false); }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleSearch() {
    if (!query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    apiClient.get<any>(`${Endpoints.search.query}?q=${encodeURIComponent(query.trim())}&type=users&limit=8`)
      .then(res => {
        const list = res.data?.users ?? res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
        setResults(list);
      })
      .catch(() => toast.error('Recherche échouée.'))
      .finally(() => setSearching(false));
  }

  async function handleTransfer() {
    if (!recipient || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setTransferring(true);
    try {
      await apiClient.post(Endpoints.wallet.transfer, {
        receiver_id: recipient.id,
        gogold_amount: Number(amount),
        note: note.trim() || undefined,
      });
      toast.success(`${amount} GoGold envoyés à @${recipient.username} !`);
      navigate('/wallet');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Transfert échoué.');
    } finally { setTransferring(false); }
  }

  const displayName = (u: UserResult) => u.display_name ?? u.username;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallet')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Transférer des GoGold</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Envoyer à un autre utilisateur</p>
        </div>
      </div>

      {/* Recipient selection */}
      {!recipient ? (
        <div className="space-y-3">
          <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Rechercher un destinataire</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Search size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Nom d'utilisateur…"
                className="flex-1 bg-transparent py-3 text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <button onClick={handleSearch} disabled={searching}
              className="px-4 rounded-xl font-bold text-sm text-white disabled:opacity-60"
              style={{ background: 'var(--primary)' }}>
              {searching ? <Spinner size="sm" /> : 'Chercher'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {results.map((u, i) => (
                <button key={u.id} onClick={() => { setRecipient(u); setResults([]); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-black/5"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <Avatar src={u.avatar_url} name={displayName(u)} size="sm" />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{displayName(u)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && query && !searching && (
            <div className="rounded-2xl py-10 flex flex-col items-center gap-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <User size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun utilisateur trouvé</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected recipient */}
          <div className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--primary)' }}>
            <Avatar src={recipient.avatar_url} name={displayName(recipient)} size="md" />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{displayName(recipient)}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{recipient.username}</p>
            </div>
            <button onClick={() => setRecipient(null)}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              Changer
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Montant</label>
            <div className="flex items-center gap-2 px-4 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent py-3.5 text-2xl font-black outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <span className="text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>GoGold</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Message (optionnel)</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Un petit mot…"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            onClick={handleTransfer}
            disabled={transferring || !amount || Number(amount) <= 0}
            className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.35)' }}>
            {transferring ? <Spinner size="sm" /> : <><Send size={16} /> Envoyer {amount || '0'} GoGold</>}
          </button>
        </div>
      )}
    </div>
  );
}
