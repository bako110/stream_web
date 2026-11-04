import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../components/ui/Dialog';
import { encodeId } from '../utils/slugId';
import {
  Users, Plus, Globe, Lock, Search, X,
  LogOut, MessageCircle, UserPlus, Zap,
  ChevronRight, Sparkles,
} from 'lucide-react';
import type { Community } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import { VerifiedBadge } from '../components/ui/Avatar';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const GRADIENTS = [
  ['#7B3FF2', '#5B2EC4'],
  ['#7B3FF2', '#7B3FF2'],
  ['#10B981', '#7B3FF2'],
  ['#7B3FF2', '#EF4444'],
  ['#14B8A6', '#7B3FF2'],
  ['#F59E0B', '#EF4444'],
];
function gradientFor(name: string): [string, string] {
  const i = (name.charCodeAt(0) || 0) % GRADIENTS.length;
  return GRADIENTS[i] as [string, string];
}

// ── Révélation à l'entrée dans l'écran (une fois) ────────────────────────────

function useReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const style: React.CSSProperties = {
    opacity: seen ? 1 : 0,
    transform: seen ? 'none' : 'translateY(18px) scale(.98)',
    transition: `opacity .5s ease ${delay}ms, transform .6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
  };
  return { ref, style };
}

interface CardProps {
  community: Community;
  isMine:    boolean;
  index:     number;
  onJoin:    () => void;
  onLeave:   () => void;
}

function useCommunityMeta(community: Community) {
  const navigate = useNavigate();
  const count    = community.members_count ?? community.member_count ?? 0;
  const [g1, g2] = gradientFor(community.name);
  return { count, g1, g2, open: () => navigate(`/communities/${encodeId(community.id)}`) };
}

function CommunityAvatar({ community, size, g1, g2 }: { community: Community; size: number; g1: string; g2: string }) {
  const radius = Math.round(size * 0.3);
  return community.avatar_url
    ? <img src={community.avatar_url} alt="" loading="lazy" className="object-cover shrink-0"
        style={{ width: size, height: size, borderRadius: radius, border: '3px solid var(--surface)', boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }} />
    : <div className="flex items-center justify-center font-black text-white shrink-0"
        style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.4, background: `linear-gradient(135deg, ${g1}, ${g2})`, border: '3px solid var(--surface)', boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }}>
        {community.name[0]?.toUpperCase()}
      </div>;
}

function ActionButton({ isMine, g1, g2, onJoin, onLeave, open, compact }: {
  isMine: boolean; g1: string; g2: string; onJoin: () => void; onLeave: () => void; open: () => void; compact?: boolean;
}) {
  return isMine ? (
    <div className="flex items-center gap-1.5 shrink-0">
      <button onClick={e => { e.stopPropagation(); open(); }}
        className="flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold text-white transition-transform active:scale-95"
        style={{ background: `linear-gradient(90deg, ${g1}, ${g2})`, boxShadow: `0 6px 14px ${g1}55` }}>
        <MessageCircle size={13} /> {!compact && 'Ouvrir'}
      </button>
      <button onClick={e => { e.stopPropagation(); onLeave(); }} aria-label="Quitter la communauté"
        className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-red-500/10 hover:text-red-500"
        style={{ border: '1.5px solid var(--border)', color: 'var(--text-tertiary)' }}>
        <LogOut size={13} />
      </button>
    </div>
  ) : (
    <button onClick={e => { e.stopPropagation(); onJoin(); }}
      className="shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold text-white transition-transform active:scale-95"
      style={{ background: 'var(--primary)', boxShadow: '0 6px 14px rgba(123,63,242,0.3)' }}>
      <UserPlus size={13} /> Rejoindre
    </button>
  );
}

// ── Ligne compacte (téléphone) ───────────────────────────────────────────────

function CommunityRow({ community, isMine, index, onJoin, onLeave }: CardProps) {
  const { count, g1, g2, open } = useCommunityMeta(community);
  const { ref, style } = useReveal<HTMLDivElement>(Math.min(index, 6) * 60);
  return (
    <div ref={ref} onClick={open} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') open(); }}
      className="flex items-center gap-3 p-3 rounded-3xl cursor-pointer active:scale-[0.99]"
      style={{ ...style, background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
      <div className="relative shrink-0">
        <CommunityAvatar community={community} size={56} g1={g1} g2={g2} />
        {community.is_private && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white"
            style={{ background: '#475569', border: '2px solid var(--surface)' }}><Lock size={9} /></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[15px] font-extrabold truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{community.name}</p>
          {community.is_verified && <VerifiedBadge size={13} />}
          {community.is_boosted && <Zap size={12} fill="#F59E0B" color="#F59E0B" className="shrink-0" />}
        </div>
        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
          {community.description || 'Une communauté Gofolyx à découvrir.'}
        </p>
        <p className="text-[11px] font-semibold mt-1 inline-flex items-center gap-1" style={{ color: g1 }}>
          <Users size={11} /> {fmtCount(count)} membre{count > 1 ? 's' : ''}
        </p>
      </div>
      <ActionButton isMine={isMine} g1={g1} g2={g2} onJoin={onJoin} onLeave={onLeave} open={open} compact />
    </div>
  );
}

// ── Carte avec bannière (tablette / bureau) ──────────────────────────────────

function CommunityCard({ community, isMine, index, onJoin, onLeave }: CardProps) {
  const { count, g1, g2, open } = useCommunityMeta(community);
  const { ref, style } = useReveal<HTMLDivElement>(Math.min(index, 8) * 70);
  return (
    <div ref={ref} onClick={open} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') open(); }}
      className="group relative flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1"
      style={{ ...style, borderRadius: '1.75rem', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
      <div className="relative h-28 shrink-0 overflow-hidden"
        style={{ background: `radial-gradient(120% 140% at 0% 0%, ${g2}cc 0%, transparent 60%), linear-gradient(135deg, ${g1}, ${g2})` }}>
        {community.banner_url && (
          <img src={community.banner_url} alt="" loading="lazy" draggable={false}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.35), transparent 60%)' }} />
        {community.is_boosted && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black"
            style={{ background: 'rgba(255,255,255,0.92)', color: '#D97706' }}><Zap size={10} fill="currentColor" /> Boosté</span>
        )}
        {community.is_private && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}><Lock size={10} /> Privée</span>
        )}
      </div>

      <div className="px-4 -mt-8 shrink-0 relative">
        <CommunityAvatar community={community} size={60} g1={g1} g2={g2} />
      </div>

      <div className="flex-1 px-4 pt-2.5 pb-3 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-base font-extrabold truncate leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{community.name}</p>
          {community.is_verified && <VerifiedBadge size={14} />}
        </div>
        <p className="text-[13px] mt-1 line-clamp-2 leading-snug min-h-[2.4em]" style={{ color: 'var(--text-secondary)' }}>
          {community.description || 'Une communauté Gofolyx à découvrir.'}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <Users size={12} style={{ color: g1 }} /> {fmtCount(count)}
        </span>
        <ActionButton isMine={isMine} g1={g1} g2={g2} onJoin={onJoin} onLeave={onLeave} open={open} />
      </div>
    </div>
  );
}

// ── À la une : grande carte immersive ────────────────────────────────────────

function FeaturedCommunity({ community, isMine, onJoin }: { community: Community; isMine: boolean; onJoin: () => void }) {
  const { count, g1, g2, open } = useCommunityMeta(community);
  const { ref, style } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} onClick={open} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') open(); }}
      className="relative overflow-hidden cursor-pointer mb-5 group"
      style={{ ...style, borderRadius: '2rem', minHeight: 210,
        background: `radial-gradient(120% 140% at 0% 0%, ${g2}cc 0%, transparent 60%), linear-gradient(135deg, ${g1}, ${g2})` }}>
      {community.banner_url && (
        <img src={community.banner_url} alt="" draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,6,20,.85) 0%, rgba(8,6,20,.15) 65%)' }} />
      <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black"
        style={{ background: 'rgba(255,255,255,0.92)', color: '#D97706' }}>
        <Zap size={11} fill="currentColor" /> À la une
      </span>
      <div className="relative flex items-end gap-3 p-5 pt-24 sm:pt-28">
        <CommunityAvatar community={community} size={64} g1={g1} g2={g2} />
        <div className="flex-1 min-w-0 pb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-lg sm:text-xl font-black text-white truncate" style={{ letterSpacing: '-0.02em' }}>{community.name}</p>
            {community.is_verified && <VerifiedBadge size={15} />}
          </div>
          <p className="text-xs text-white/75 mt-0.5 inline-flex items-center gap-1"><Users size={12} /> {fmtCount(count)} membre{count > 1 ? 's' : ''}</p>
        </div>
        {!isMine && (
          <button onClick={e => { e.stopPropagation(); onJoin(); }}
            className="shrink-0 h-10 px-5 rounded-full text-xs font-bold text-white inline-flex items-center gap-1.5 active:scale-95"
            style={{ background: 'var(--primary)', boxShadow: '0 8px 20px rgba(123,63,242,0.45)' }}>
            <UserPlus size={14} /> Rejoindre
          </button>
        )}
      </div>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <>
      <div className="sm:hidden space-y-3">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-[84px] rounded-3xl gt-skeleton" />)}
      </div>
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-72 rounded-[1.75rem] gt-skeleton" />)}
      </div>
    </>
  );
}

type Filter = 'all' | 'popular' | 'verified' | 'public' | 'private';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' }, { key: 'popular', label: 'Populaires' },
  { key: 'verified', label: 'Vérifiées' }, { key: 'public', label: 'Publiques' }, { key: 'private', label: 'Privées' },
];

// ── CreateModal ───────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step,      setStep]      = useState<'info' | 'settings'>('info');
  const [name,      setName]      = useState('');
  const [desc,      setDesc]      = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [error,     setError]     = useState('');

  const [g1, g2] = name ? gradientFor(name) : ['#7B3FF2', '#5B2EC4'];

  async function handleCreate() {
    if (!name.trim()) { setError('Le nom est requis'); return; }
    setCreating(true); setError('');
    try {
      await apiClient.post(Endpoints.communities.list, {
        name: name.trim(),
        description: desc.trim() || undefined,
        is_private: isPrivate,
      });
      onCreated(); onClose();
    } catch (e: any) { setError(e?.message ?? 'Impossible de créer'); }
    finally { setCreating(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      {/* Bottom-sheet plein écran sur mobile (comportement d'origine), modale
          centrée avec largeur max sur desktop (sm+) — sans max-w, la feuille
          s'étirait sur toute la largeur de la fenêtre au lieu de rester une
          modale de taille raisonnable une fois sur grand écran. */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden
        sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:w-full sm:max-w-md"
        style={{ background: 'var(--surface)', maxHeight: '90vh', boxShadow: '0 -16px 64px rgba(0,0,0,0.25)' }}>

        <div className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <div className="flex items-center px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={step === 'settings' ? () => setStep('info') : onClose}
            className="w-16 flex items-center text-sm" style={{ color: 'var(--text-primary)' }}>
            {step === 'settings' ? '← Retour' : <X size={18} />}
          </button>
          <div className="flex-1 text-center">
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {step === 'info' ? 'Nouvelle communauté' : 'Paramètres'}
            </p>
            <div className="flex justify-center gap-1.5 mt-1">
              {[0, 1].map(i => (
                <div key={i} className="h-1 rounded-full transition-all"
                  style={{
                    width: (step === 'info' ? 0 : 1) === i ? 16 : 6,
                    background: (step === 'info' ? 0 : 1) >= i ? 'var(--primary)' : 'var(--border)',
                  }} />
              ))}
            </div>
          </div>
          {step === 'info' ? (
            <button onClick={() => { if (!name.trim()) { setError('Le nom est requis'); return; } setError(''); setStep('settings'); }}
              className="w-16 text-right text-sm font-bold" style={{ color: 'var(--primary)' }}>
              Suivant
            </button>
          ) : <div className="w-16" />}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4 min-h-0">
          {step === 'info' ? (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl"
                  style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                  {name ? name[0].toUpperCase() : '?'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>NOM</label>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={60}
                  placeholder="Ex: Cinéma africain, Jazz, Foot…" className="input w-full" autoFocus />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>DESCRIPTION</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={300} rows={3}
                  placeholder="Décrivez votre communauté…" className="input w-full resize-none" />
                <p className="text-[10px] text-right mt-1" style={{ color: 'var(--text-tertiary)' }}>{desc.length}/300</p>
              </div>
              {error && <p className="text-sm text-center" style={{ color: '#EF4444' }}>{error}</p>}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xl shrink-0"
                  style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                  {name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                  {desc && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>}
                </div>
              </div>

              <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>CONFIDENTIALITE</p>

              {[
                { val: false, icon: <Globe size={18} />, color: '#7B3FF2', label: 'Publique',  sub: 'Tout le monde peut rejoindre' },
                { val: true,  icon: <Lock size={18} />,  color: '#7B3FF2', label: 'Privée',    sub: 'Sur invitation uniquement' },
              ].map(opt => (
                <button key={String(opt.val)} onClick={() => setIsPrivate(opt.val)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1.5px solid ${isPrivate === opt.val ? opt.color : 'var(--border)'}`,
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: opt.color + '20', color: opt.color }}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{opt.sub}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ border: `2px solid ${isPrivate === opt.val ? opt.color : 'var(--border)'}` }}>
                    {isPrivate === opt.val && <div className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />}
                  </div>
                </button>
              ))}

              {error && <p className="text-sm text-center" style={{ color: '#EF4444' }}>{error}</p>}

              <button onClick={handleCreate} disabled={creating}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(90deg, #7B3FF2, #5B2EC4)' }}>
                {creating ? <Spinner size="sm" /> : <><Users size={16} /> Créer la communauté</>}
              </button>
              <div className="h-4" />
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── CommunitiesPage ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const [tab,         setTab]         = useState<'discover' | 'mine'>('discover');
  const [all,         setAll]         = useState<Community[]>([]);
  const [query,       setQuery]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const { confirm, ConfirmDialog }    = useConfirm();

  const load = useCallback(async (reset = true) => {
    const nextPage = reset ? 1 : page + 1;
    if (reset) { setLoading(true); setAll([]); setPage(1); setHasMore(true); }
    else setLoadingMore(true);
    try {
      // Les deux endpoints supportent page/limit — auparavant "mine" n'était
      // jamais paginé (lot fixe, page/limit ignorés), donc au-delà du 1er
      // lot les communautés suivantes de l'utilisateur restaient invisibles.
      const endpoint = tab === 'mine'
        ? `${Endpoints.communities.mine}?page=${nextPage}&limit=${PAGE_SIZE}`
        : `${Endpoints.communities.discover}?page=${nextPage}&limit=${PAGE_SIZE}`;
      const res = await apiClient.get<any>(endpoint);
      const raw = res.data;
      const items: Community[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? raw?.results ?? [];
      if (reset) setAll(items);
      else setAll(prev => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(items.length === PAGE_SIZE);
    } catch { if (reset) setAll([]); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [tab, page]);

  useEffect(() => { load(true); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll infini via IntersectionObserver sur un sentinel en fin de liste.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || loadingMore || !hasMore || query) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) load(false); },
      { rootMargin: '200px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, loadingMore, hasMore, query, load]);

  const [filter, setFilter] = useState<Filter>('all');
  const countOf = (c: Community) => c.members_count ?? c.member_count ?? 0;

  const communities = (() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? all.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      : all;
    if (filter === 'verified') list = list.filter(c => c.is_verified);
    else if (filter === 'public') list = list.filter(c => !c.is_private);
    else if (filter === 'private') list = list.filter(c => c.is_private);
    else if (filter === 'popular') list = [...list].sort((a, b) => countOf(b) - countOf(a));
    return list;
  })();

  // « À la une » : communauté boostée (sinon la plus populaire) — onglet Découvrir, sans filtre.
  const featured = tab === 'discover' && !query.trim() && filter === 'all' && all.length >= 4
    ? ([...all].sort((a, b) => (Number(!!b.is_boosted) - Number(!!a.is_boosted)) || (countOf(b) - countOf(a)))[0])
    : null;
  const listItems = featured ? communities.filter(c => c.id !== featured.id) : communities;

  async function handleJoin(id: string) {
    try { await apiClient.post(Endpoints.communities.join(id)); load(true); } catch {}
  }

  async function handleLeave(id: string) {
    const ok = await confirm({ title: 'Quitter cette communauté ?', danger: true, confirmLabel: 'Quitter' });
    if (!ok) return;
    try { await apiClient.post(Endpoints.communities.leave(id)); load(true); } catch {}
  }

  return (
    <div className="st-v2 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-28 lg:pb-10">

          {/* ── En-tête ── */}
          <div className="relative overflow-hidden mb-5 p-5 sm:p-7"
            style={{ borderRadius: '2rem', background: 'linear-gradient(135deg, #7B3FF2 0%, #5B2EC4 55%, #3B1E8F 100%)', boxShadow: '0 18px 44px -18px rgba(91,46,196,.6)' }}>
            <span aria-hidden className="absolute -top-16 -right-10 w-52 h-52 rounded-full" style={{ background: 'rgba(255,255,255,.12)', filter: 'blur(8px)' }} />
            <span aria-hidden className="absolute -bottom-20 left-1/3 w-56 h-56 rounded-full" style={{ background: 'rgba(236,72,153,.28)', filter: 'blur(40px)' }} />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase text-white/80" style={{ letterSpacing: '0.13em' }}>
                  <Sparkles size={12} /> Découvrir et échanger
                </span>
                <h1 className="text-2xl sm:text-3xl font-black mt-1.5 text-white" style={{ letterSpacing: '-0.03em' }}>Communautés</h1>
                <p className="text-sm mt-1 text-white/75 max-w-md">Rejoignez des groupes autour de vos passions : discussions, événements et partages.</p>
              </div>
              <button onClick={() => setShowCreate(true)}
                className="shrink-0 flex items-center gap-1.5 h-11 px-5 rounded-full text-sm font-bold transition-transform active:scale-95"
                style={{ background: '#fff', color: '#5B2EC4', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
                <Plus size={16} /> <span className="hidden xs:inline sm:inline">Créer</span>
              </button>
            </div>
          </div>

          {/* ── Recherche ── */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une communauté…"
              className="w-full h-12 pl-11 pr-11 text-sm rounded-full outline-none transition-all"
              style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 4px rgba(123,63,242,0.12)'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }} />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Effacer"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* ── Onglets (contrôle segmenté en pilule) ── */}
          <div className="flex p-1 rounded-full mb-5" style={{ background: 'var(--bg-secondary)' }}>
            {(['discover', 'mine'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 h-10 rounded-full text-sm font-bold transition-all"
                style={tab === t
                  ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: '0 2px 10px rgba(11,11,16,0.1)' }
                  : { color: 'var(--text-tertiary)' }}>
                {t === 'discover' ? 'Découvrir' : 'Mes communautés'}
              </button>
            ))}
          </div>

          {/* ── Filtres ── */}
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 mb-1" style={{ scrollbarWidth: 'none' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="shrink-0 h-9 px-4 rounded-full text-xs font-bold transition-all"
                style={filter === f.key
                  ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 6px 14px rgba(123,63,242,0.3)' }
                  : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1.5px solid var(--border)' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Contenu ── */}
          {loading ? (
            <CommunitySkeleton />
          ) : communities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-3xl"
              style={{ border: '1.5px dashed var(--border)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(123,63,242,0.08)' }}>
                <Users size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {tab === 'mine' ? 'Aucune communauté' : query ? 'Aucun résultat' : 'Aucune communauté'}
              </p>
              <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
                {tab === 'mine'
                  ? 'Créez ou rejoignez une communauté'
                  : query ? `Aucun résultat pour "${query}"` : 'Soyez le premier à créer !'}
              </p>
              {tab === 'mine' && (
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 h-11 px-6 rounded-full font-bold text-white text-sm mt-1"
                  style={{ background: 'var(--primary)' }}>
                  <Plus size={14} /> Créer une communauté
                </button>
              )}
              {tab === 'discover' && !query && (
                <button onClick={() => navigate('/discover/communities')}
                  className="flex items-center gap-2 h-11 px-6 rounded-full font-bold text-sm mt-1"
                  style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}>
                  Explorer toutes les communautés <ChevronRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-[11px] font-black uppercase mb-3 px-1" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.12em' }}>
                {tab === 'discover'
                  ? `${communities.length} communauté${communities.length > 1 ? 's' : ''}`
                  : `Mes communautés · ${communities.length}`}
              </p>

              {featured && <FeaturedCommunity community={featured} isMine={false} onJoin={() => handleJoin(featured.id)} />}

              {/* Téléphone : liste compacte */}
              <div className="sm:hidden space-y-3">
                {listItems.map((c, i) => (
                  <CommunityRow key={c.id} community={c} index={i} isMine={tab === 'mine'}
                    onJoin={() => handleJoin(c.id)} onLeave={() => handleLeave(c.id)} />
                ))}
              </div>
              {/* Tablette / bureau : cartes avec bannière */}
              <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4">
                {listItems.map((c, i) => (
                  <CommunityCard key={c.id} community={c} index={i} isMine={tab === 'mine'}
                    onJoin={() => handleJoin(c.id)} onLeave={() => handleLeave(c.id)} />
                ))}
              </div>

              {/* Scroll infini — sentinel observé, chargement automatique */}
              {hasMore && !query && (
                <div ref={sentinelRef} className="flex justify-center py-6">
                  {loadingMore && <Spinner size="sm" />}
                </div>
              )}

              {/* Lien vers discover */}
              {tab === 'discover' && !hasMore && !query && (
                <div className="flex justify-center pt-6">
                  <button onClick={() => navigate('/discover/communities')}
                    className="flex items-center gap-1.5 h-10 px-5 rounded-full text-xs font-bold"
                    style={{ border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}>
                    Explorer toutes les communautés <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => load(true)} />}
      {ConfirmDialog}
    </div>
  );
}
