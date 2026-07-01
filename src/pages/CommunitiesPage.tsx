import { PageLoader } from '../components/ui/Spinner';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../components/ui/Dialog';
import { encodeId } from '../utils/slugId';
import {
  Users, Plus, Globe, Lock, Search, X,
  LogOut, MessageCircle, UserPlus, Zap,
  ChevronRight,
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

// ── CommunityRow ──────────────────────────────────────────────────────────────

function CommunityRow({
  community, isMine, onJoin, onLeave,
}: {
  community: Community;
  isMine:    boolean;
  onJoin:    () => void;
  onLeave:   () => void;
}) {
  const navigate   = useNavigate();
  const count      = community.members_count ?? (community as any).member_count ?? 0;
  const [g1, g2]   = gradientFor(community.name);
  const isBoosted  = (community as any).is_boosted ?? false;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-all cursor-pointer"
      onClick={() => navigate(`/communities/${encodeId(community.id)}`)}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Avatar */}
      {community.avatar_url
        ? <img src={community.avatar_url}
            className="w-11 h-11 rounded-xl object-cover shrink-0"
            style={{ border: '1px solid var(--border)' }} alt="" />
        : <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-lg shrink-0"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
            {community.name[0]?.toUpperCase()}
          </div>
      }

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
            {community.name}
          </p>
          {community.is_verified && <VerifiedBadge size={13} />}
          {community.is_private && <Lock size={10} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
          {isBoosted && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
              <Zap size={9} fill="currentColor" /> Boosté
            </span>
          )}
        </div>
        <div className="flex items-center mt-0.5 min-w-0" style={{ color: 'var(--text-tertiary)' }}>
          <span className="text-xs shrink-0">{fmtCount(count)} membre{count > 1 ? 's' : ''}</span>
          {community.description && (
            <span className="text-xs ml-1.5 truncate min-w-0">· {community.description}</span>
          )}
        </div>
      </div>

      {/* Action */}
      {isMine ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); navigate(`/communities/${encodeId(community.id)}`); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            style={{ background: `linear-gradient(90deg, ${g1}, ${g2})` }}>
            <MessageCircle size={11} /> Ouvrir
          </button>
          <button
            onClick={e => { e.stopPropagation(); onLeave(); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors shrink-0"
            style={{ border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.stopPropagation(); (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}>
            <LogOut size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); onJoin(); }}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(123,63,242,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}>
          <UserPlus size={11} /> Rejoindre
        </button>
      )}
    </div>
  );
}

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
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl overflow-hidden"
        style={{ background: 'var(--surface)', maxHeight: '90vh', boxShadow: '0 -16px 64px rgba(0,0,0,0.25)' }}>

        <div className="flex justify-center pt-3 pb-1 shrink-0">
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
      const endpoint = tab === 'mine'
        ? Endpoints.communities.mine
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

  const communities = query.trim()
    ? all.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()))
    : all;

  async function handleJoin(id: string) {
    try { await apiClient.post(Endpoints.communities.join(id)); load(true); } catch {}
  }

  async function handleLeave(id: string) {
    const ok = await confirm({ title: 'Quitter cette communauté ?', danger: true, confirmLabel: 'Quitter' });
    if (!ok) return;
    try { await apiClient.post(Endpoints.communities.leave(id)); load(true); } catch {}
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-4 pb-0" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(123,63,242,0.12)' }}>
              <Users size={16} style={{ color: 'var(--primary)' }} />
            </div>
            <h1 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Communautés</h1>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--primary)' }}>
            <Plus size={14} /> Créer
          </button>
        </div>

        {/* Recherche */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une communauté…"
            className="input w-full pl-9 pr-9 text-sm" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex">
          {(['discover', 'mine'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3 text-sm font-bold relative transition-colors"
              style={{ color: tab === t ? 'var(--primary)' : 'var(--text-tertiary)' }}>
              {t === 'discover' ? 'Découvrir' : 'Mes communautés'}
              {tab === t && (
                <div className="absolute bottom-0 left-[15%] right-[15%] h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7B3FF2, #5B2EC4)' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        {loading ? (
          <PageLoader />
        ) : communities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm mt-1"
                style={{ background: 'var(--primary)' }}>
                <Plus size={14} /> Créer une communauté
              </button>
            )}
            {tab === 'discover' && !query && (
              <button onClick={() => navigate('/discover/communities')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm mt-1"
                style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}>
                Explorer toutes les communautés <ChevronRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Label section */}
            <div className="px-4 pt-3 pb-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                {tab === 'discover' ? `${communities.length} communauté${communities.length > 1 ? 's' : ''}` : `Mes communautés · ${communities.length}`}
              </p>
            </div>

            {/* Rows */}
            <div>
              {communities.map(c => (
                <CommunityRow key={c.id} community={c} isMine={tab === 'mine'}
                  onJoin={() => handleJoin(c.id)} onLeave={() => handleLeave(c.id)} />
              ))}
            </div>

            {/* Charger plus */}
            {hasMore && !query && tab === 'discover' && (
              <div className="flex justify-center py-6">
                <button onClick={() => load(false)} disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(123,63,242,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}>
                  {loadingMore ? <Spinner size="sm" /> : 'Charger plus'}
                </button>
              </div>
            )}

            {/* Lien vers discover */}
            {tab === 'discover' && !hasMore && !query && (
              <div className="flex justify-center py-4">
                <button onClick={() => navigate('/discover/communities')}
                  className="flex items-center gap-1.5 text-xs font-bold"
                  style={{ color: 'var(--text-tertiary)' }}>
                  Explorer toutes les communautés <ChevronRight size={12} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => load(true)} />}
      {ConfirmDialog}
    </div>
  );
}
