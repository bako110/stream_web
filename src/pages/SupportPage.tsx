import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HelpCircle, MessageCircle, ChevronDown, ChevronUp, Send, ArrowLeft,
  Headphones, Mail, Clock, Plus,
} from 'lucide-react';
import { apiClient } from '../api';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Types (identiques au mobile) ──────────────────────────────────────────────

interface SupportMessage {
  id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
  sender_name?: string | null;
  sender_role?: string | null;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  messages: SupportMessage[];
  created_at: string;
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Comment acheter des Gofolyx GoGold ?',
    a: 'Rendez-vous dans Wallet > Acheter des GoGold. Vous pouvez payer par carte bancaire, mobile money ou virement. Les GoGold sont credites instantanement.',
  },
  {
    q: 'Comment devenir createur monetise ?',
    a: 'Allez dans Wallet > Monetisation. Vous devez avoir au moins 100 abonnes et 10 reels publies. La validation prend 2-5 jours ouvrables.',
  },
  {
    q: 'Comment retirer mes gains ?',
    a: 'Dans Wallet > Retirer. Vous pouvez recevoir vos gains par Stripe (carte bancaire) ou mobile money. Le minimum de retrait est 50 FXC.',
  },
  {
    q: 'Mon compte a ete bloque, que faire ?',
    a: 'Si votre compte est bloque, contactez notre support via le chat ci-dessous. Precisez votre nom d\'utilisateur et decrivez la situation.',
  },
  {
    q: 'Comment supprimer mon compte ?',
    a: 'Allez dans Parametres > Zone de danger > Supprimer le compte. Attention, cette action est irreversible et supprime toutes vos donnees.',
  },
  {
    q: 'Mes billets sont perdus / n\'apparaissent pas',
    a: 'Verifiez dans Mes billets. Si le probleme persiste apres 24h, contactez le support avec votre reference de paiement.',
  },
  {
    q: 'Comment signaler un contenu inapproprie ?',
    a: 'Sur chaque contenu, appuyez sur le menu (3 points) et choisissez "Signaler". Notre equipe examine les signalements sous 48h.',
  },
  {
    q: 'Comment changer mon mot de passe ?',
    a: 'Allez dans Parametres > Compte > Changer le mot de passe. Vous aurez besoin de votre ancien mot de passe ou de votre email.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-all"
        style={{ background: open ? 'rgba(123,63,242,0.06)' : 'var(--surface)' }}>
        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{q}</p>
        {open
          ? <ChevronUp size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p>
        </div>
      )}
    </div>
  );
}

// ── SupportChat — identique au mobile : tickets + polling 8s ─────────────────

function SupportChat({ onClose }: { onClose: () => void }) {
  const { user: me } = useAuthStore();

  const [ticket,      setTicket]      = useState<SupportTicket | null>(null);
  const [messages,    setMessages]    = useState<SupportMessage[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [creating,    setCreating]    = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Charge les tickets existants au montage
  useEffect(() => {
    apiClient.get<any>('/api/v1/support/tickets')
      .then(r => {
        const list: SupportTicket[] = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? [];
        // Prendre le dernier ticket ouvert (ou le plus recent)
        const open = list.find(t => t.status === 'open') ?? list[0] ?? null;
        if (open) {
          setTicket(open);
          setMessages(open.messages ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Polling toutes les 8 secondes quand un ticket est ouvert (même logique que le mobile)
  const pollMessages = useCallback(() => {
    if (!ticket) return;
    apiClient.get<any>(`/api/v1/support/tickets/${ticket.id}`)
      .then(r => {
        const t: SupportTicket = r.data?.data ?? r.data;
        if (t?.messages) {
          setMessages(t.messages);
        }
      })
      .catch(() => {});
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    pollRef.current = setInterval(pollMessages, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ticket, pollMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Creer un nouveau ticket avec le premier message (même payload que le mobile)
  async function createTicket(body: string) {
    setCreating(true);
    try {
      const subject = body.length > 100 ? body.slice(0, 100) : body;
      const res = await apiClient.post<any>('/api/v1/support/tickets', { subject, body });
      const newTicket: SupportTicket = res.data?.data ?? res.data;
      setTicket(newTicket);
      setMessages(newTicket.messages ?? [{ id: Date.now().toString(), body, is_staff: false, created_at: new Date().toISOString() }]);
    } catch {
      toast.error('Impossible de créer le ticket');
    } finally { setCreating(false); }
  }

  const isClosed = ticket?.status === 'closed';

  // Envoyer un message sur le ticket existant
  async function sendMessage() {
    if (!input.trim() || sending || isClosed) return;
    const body = input.trim();
    setInput('');

    if (!ticket) {
      await createTicket(body);
      return;
    }

    setSending(true);
    // Optimistic update
    const optimistic: SupportMessage = {
      id: `tmp-${Date.now()}`,
      body,
      is_staff: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await apiClient.post(`/api/v1/support/tickets/${ticket.id}/messages`, { body });
      // Le polling va synchroniser les vrais messages
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(body);
      if (err?.status === 409) {
        toast.error('Ce ticket est fermé — ouvrez une nouvelle demande.');
        setTicket(t => t ? { ...t, status: 'closed' } : t);
      } else {
        toast.error('Erreur lors de l\'envoi');
      }
    } finally { setSending(false); }
  }

  // Repart sur une conversation fraîche (le ticket fermé reste consultable en historique)
  function startNewTicket() {
    setTicket(null);
    setMessages([]);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={onClose} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(123,63,242,0.12)' }}>
          <Headphones size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Support Gofolyx</p>
          <p className="text-[11px]" style={{ color: '#7B3FF2' }}>
            {ticket ? `Ticket #${ticket.id.slice(0, 8)}… · ${ticket.status}` : 'Généralement répond en moins d\'1h'}
          </p>
        </div>
        {ticket && (
          <button
            onClick={() => { setTicket(null); setMessages([]); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}
            title="Nouveau ticket">
            <Plus size={13} /> Nouveau
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ background: 'var(--bg)' }}>
        {loading ? (
          <PageLoader />
        ) : (
          <>
            {/* Message de bienvenue */}
            <div className="flex justify-start mb-4">
              <div className="w-fit max-w-[85%] sm:max-w-[560px] rounded-2xl rounded-bl-sm px-4 py-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--primary)' }}>Support Gofolyx</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {ticket
                    ? 'Voici l\'historique de votre ticket. Notre équipe vous répondra bientôt.'
                    : 'Bonjour ! Décrivez votre problème, notre équipe vous répondra rapidement.'}
                </p>
              </div>
            </div>

            {messages.map(msg => {
              const isStaff = msg.is_staff;
              return (
                <div key={msg.id} className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}>
                  <div className={`w-fit max-w-[85%] sm:max-w-[560px] rounded-2xl px-4 py-3 ${isStaff ? 'rounded-bl-sm' : 'rounded-br-sm'}`}
                    style={isStaff
                      ? { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
                      : { background: 'var(--primary)', color: '#fff' }}>
                    {isStaff && (
                      <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--primary)' }}>
                        {msg.sender_name ?? 'Support Gofolyx'}
                        {msg.sender_role ? ` · ${msg.sender_role}` : ''}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-line break-words">{msg.body}</p>
                    <p className={`text-[10px] mt-1`}
                      style={{ color: isStaff ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.6)' }}>
                      {formatDistanceToNow(new Date(msg.created_at), { locale: fr, addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Ticket fermé — conversation en lecture seule, il faut en ouvrir une nouvelle */}
      {isClosed ? (
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Ce ticket est fermé.</p>
          <button onClick={startNewTicket}
            className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
            style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}>
            Nouvelle demande
          </button>
        </div>
      ) : (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <input
            className="input flex-1 text-sm rounded-full px-4 py-2.5"
            placeholder="Décrivez votre problème…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={sending || creating}
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending || creating}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 shrink-0 transition-all"
            style={{ background: input.trim() ? 'var(--primary)' : 'var(--bg-secondary)' }}>
            {(sending || creating) ? <Spinner size="sm" /> : <Send size={16} style={{ color: input.trim() ? '#fff' : 'var(--text-tertiary)' }} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function SupportPage() {
  const [showChat, setShowChat] = useState(false);

  if (showChat) return <SupportChat onClose={() => setShowChat(false)} />;

  return (
    <div className="flex flex-col h-full min-h-screen overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="w-full mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <HelpCircle size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Aide & Support</h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Trouvez des réponses ou contactez notre équipe.</p>
          </div>
        </div>

        {/* Canaux de contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={() => setShowChat(true)}
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(123,63,242,0.12)' }}>
              <MessageCircle size={22} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Ticket support</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Envoyez un ticket, on vous répond</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7B3FF2' }} />
                <span className="text-[10px] font-semibold" style={{ color: '#7B3FF2' }}>Disponible</span>
              </div>
            </div>
          </button>

          <a href="mailto:support@gofolyx.com"
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#7B3FF2')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: '#7B3FF215' }}>
              <Mail size={22} style={{ color: '#7B3FF2' }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Email</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>support@gofolyx.com</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock size={10} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Réponse sous 24h</span>
              </div>
            </div>
          </a>
        </div>

        {/* FAQ */}
        <div>
          <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
            QUESTIONS FRÉQUENTES
          </p>
          <div className="space-y-2">
            {FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 rounded-2xl text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Gofolyx v1.0 · © 2026</p>
        </div>

      </div>
    </div>
  );
}
