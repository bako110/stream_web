import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Share2, Mail, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { extractApiErrorMessage } from '../../utils/apiError';

export type ShareTargetType = 'post' | 'event' | 'concert' | 'reel' | 'content' | 'live' | 'tournament';

// Types acceptés par le backend pour le partage interne (message type=share) —
// live/tournament n'ont pas de résolution serveur pour l'instant.
const INTERNAL_SHARE_TYPES = new Set(['post', 'reel', 'event', 'concert', 'content']);

interface Conversation {
  user: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null };
}

interface Props {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  desc?: string;
  image?: string;
  targetType: ShareTargetType;
  targetId: string;
  onShared?: () => void;
}

// Plateformes suivies côté backend (app/db/postgres/models/share.py::SharePlatform) —
// les autres boutons (telegram/messenger/email) envoient "external" pour rester
// compatibles avec l'enum existant sans migration DB.
type TrackedPlatform = 'whatsapp' | 'facebook' | 'twitter' | 'external';

function recordShare(targetType: ShareTargetType, targetId: string, platform: TrackedPlatform) {
  const key = targetType === 'content' ? 'content_id'
    : targetType === 'concert' ? 'concert_id'
    : targetType === 'event'   ? 'event_id'
    : targetType === 'reel'    ? 'reel_id'
    : targetType === 'live'    ? 'live_id'
    : targetType === 'tournament' ? 'tournament_id'
    : 'post_id';
  apiClient.post(Endpoints.social.share, { [key]: targetId, platform }).catch(() => {});
}

// ── Icônes plateforme (badges de marque, lucide-react n'en fournit pas) ────────

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="#25D366">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.005c5.46 0 9.9-4.45 9.9-9.9 0-2.65-1.03-5.13-2.9-7C17.17 3.03 14.7 2 12.04 2zm0 18.13a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.21-8.26 8.21zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14-.01-.31-.01-.47-.01a.9.9 0 0 0-.65.31c-.23.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.17 1.73 2.64 4.19 3.7.58.25 1.04.4 1.39.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="#26A5E4">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.64 6.8-1.677 7.91c-.126.567-.46.705-.93.44l-2.57-1.897-1.24 1.195c-.137.137-.253.253-.518.253l.185-2.63 4.784-4.324c.208-.185-.045-.288-.323-.104l-5.914 3.72-2.548-.796c-.554-.173-.564-.554.115-.82l9.958-3.837c.462-.173.866.11.678.876z"/>
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="#0084FF">
      <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.905 1.446 5.49 3.706 7.184V22l3.387-1.858c.904.25 1.865.386 2.907.386 5.523 0 10-4.145 10-9.285S17.523 2 12 2zm1.008 12.5-2.548-2.72-4.97 2.72 5.467-5.803 2.61 2.72 4.907-2.72z"/>
    </svg>
  );
}

const SHEET_ANIM = 'animate-reveal-up';

export function ShareModal({ open, onClose, url, title, desc, image, targetType, targetId, onShared }: Props) {
  const [copied, setCopied] = useState(false);

  // ── Envoi interne à un contact (comme Instagram/Facebook) ──────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [search, setSearch] = useState('');
  const [sendingTo, setSendingTo] = useState<Set<string>>(new Set());
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const fetchedConvos = useRef(false);
  const canSendInternally = INTERNAL_SHARE_TYPES.has(targetType);

  useEffect(() => {
    if (!open || !canSendInternally || fetchedConvos.current) return;
    fetchedConvos.current = true;
    setLoadingConvos(true);
    apiClient.get<unknown>(Endpoints.messages.conversations)
      .then(res => {
        const raw = res.data as any;
        const list: any[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
        setConversations(list.filter(c => c?.user?.id));
      })
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, [open, canSendInternally]);

  // Reset à la fermeture — rouvrir sur un autre contenu doit repartir propre
  useEffect(() => {
    if (!open) { setSentTo(new Set()); setSendingTo(new Set()); setSearch(''); }
  }, [open]);

  const sendToUser = useCallback(async (userId: string) => {
    if (sendingTo.has(userId) || sentTo.has(userId)) return;
    setSendingTo(prev => new Set(prev).add(userId));
    try {
      await apiClient.post(Endpoints.messages.conversation(userId), {
        content: '',
        message_type: 'share',
        attachment_meta: { share_type: targetType, share_id: targetId },
      });
      setSentTo(prev => new Set(prev).add(userId));
      recordShare(targetType, targetId, 'external');
      onShared?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Impossible d'envoyer ce contenu."));
    } finally {
      setSendingTo(prev => { const n = new Set(prev); n.delete(userId); return n; });
    }
  }, [sendingTo, sentTo, targetType, targetId, onShared]);

  if (!open) return null;

  const filteredConvos = search.trim()
    ? conversations.filter(c =>
        (c.user.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.user.username ?? '').toLowerCase().includes(search.toLowerCase()))
    : conversations;

  function share(platform: TrackedPlatform, action: () => void) {
    action();
    recordShare(targetType, targetId, platform);
    onShared?.();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    recordShare(targetType, targetId, 'external');
    onShared?.();
    setTimeout(() => { setCopied(false); onClose(); }, 1200);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
      recordShare(targetType, targetId, 'external');
      onShared?.();
      onClose();
    } catch { /* annulé par l'utilisateur */ }
  }

  const encodedUrl   = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const PLATFORMS: { id: string; label: string; icon: React.ReactNode; bg: string; onClick: () => void }[] = [
    {
      id: 'facebook', label: 'Facebook', icon: <FacebookIcon />, bg: '#1877F215',
      onClick: () => share('facebook', () =>
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'width=580,height=520')),
    },
    {
      id: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon />, bg: '#25D36615',
      onClick: () => share('whatsapp', () =>
        window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, '_blank')),
    },
    {
      id: 'twitter', label: 'X (Twitter)', icon: <XIcon />, bg: 'var(--bg-secondary)',
      onClick: () => share('twitter', () =>
        window.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, '_blank', 'width=580,height=520')),
    },
    {
      id: 'telegram', label: 'Telegram', icon: <TelegramIcon />, bg: '#26A5E415',
      onClick: () => share('external', () =>
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`, '_blank')),
    },
    {
      id: 'messenger', label: 'Messenger', icon: <MessengerIcon />, bg: '#0084FF15',
      onClick: () => share('external', () =>
        window.open(`https://www.facebook.com/dialog/send?link=${encodedUrl}&redirect_uri=${encodedUrl}&app_id=966242223397117`, '_blank', 'width=580,height=520')),
    },
    {
      id: 'email', label: 'E-mail', icon: <Mail size={24} style={{ color: 'var(--text-secondary)' }} />, bg: 'var(--bg-secondary)',
      onClick: () => share('external', () => {
        window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
      }),
    },
  ];

  // Portail vers document.body — un ancêtre de la page (ex: header avec
  // backdrop-filter) peut créer un containing block CSS qui piège ce modal
  // fixed et le rend invisible bien que correctement monté dans le DOM
  // (même bug que MessagesPopover, voir Topbar.tsx).
  return createPortal((
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl sm:mb-6 overflow-hidden flex flex-col ${SHEET_ANIM}`}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="w-9 h-1 rounded-full mx-auto mt-3 sm:hidden shrink-0" style={{ background: 'var(--border)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Partager</p>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Preview card */}
          <div className="rounded-xl mx-3 mb-3 overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {image && (
              <img src={image} alt={title}
                className="w-full object-cover"
                style={{ maxHeight: '160px', objectPosition: 'top' }} />
            )}
            <div className="p-3" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
              {desc && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>}
              <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--primary)' }}>gofolyx.com</p>
            </div>
          </div>

          {/* Envoyer à — contacts internes, comme Instagram/Facebook */}
          {canSendInternally && (
            <div className="mb-3">
              <div className="px-4 mb-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-tertiary)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un contact…"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl focus:outline-none"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              {loadingConvos ? (
                <div className="flex gap-3 px-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
                      <div className="w-10 h-2 rounded-full animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
                    </div>
                  ))}
                </div>
              ) : filteredConvos.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
                  {search ? 'Aucun contact trouvé' : 'Aucune conversation récente'}
                </p>
              ) : (
                <div className="flex gap-3 px-4 pb-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {filteredConvos.map(c => {
                    const u = c.user;
                    const sending = sendingTo.has(u.id);
                    const sent = sentTo.has(u.id);
                    return (
                      <button key={u.id} onClick={() => sendToUser(u.id)} disabled={sending}
                        className="flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95"
                        style={{ width: 56 }}>
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" style={{ opacity: sent ? 0.5 : 1 }} />
                            : (u.display_name ?? u.username ?? '?').charAt(0).toUpperCase()}
                          {sent && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                              <Check size={18} color="#fff" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--text-secondary)' }}>
                          {sending ? '…' : (u.display_name ?? u.username ?? 'Utilisateur')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Grille des plateformes — comme le "partager sur..." de Facebook */}
          <div className="grid grid-cols-4 gap-y-4 px-4 pb-4">
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={p.onClick}
                className="flex flex-col items-center gap-1.5 transition-transform active:scale-95">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: p.bg }}>
                  {p.icon}
                </div>
                <span className="text-[11px] font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>

          {/* URL + copier */}
          <div className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <p className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{url}</p>
          </div>
        </div>

        {/* Actions bas */}
        <div className="flex gap-2 p-3 pt-0 shrink-0">
          <button onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'var(--bg-secondary)', color: copied ? '#22C55E' : 'var(--text-primary)', border: '1px solid var(--border)' }}>
            {copied ? <><Check size={15} /> Copié !</> : <><Copy size={15} /> Copier le lien</>}
          </button>
          {typeof navigator.share === 'function' && (
            <button onClick={nativeShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
              style={{ background: 'var(--primary)' }}>
              <Share2 size={15} /> Plus d'options
            </button>
          )}
        </div>
      </div>
    </div>
  ), document.body);
}
