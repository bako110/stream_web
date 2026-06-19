import { PageLoader } from '../components/ui/Spinner';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../components/ui/Dialog';
import { encodeId } from '../utils/slugId';
import {
  Users, Plus, Globe, Lock, Search, X,
  LogOut, MessageCircle, BadgeCheck, UserPlus,
} from 'lucide-react';
import type { Community } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';

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
  ['#7B3FF2', '#7B3FF2'],
  ['#14B8A6', '#7B3FF2'],
];
function gradientFor(name: string): [string, string] {
  const i = (name.charCodeAt(0) || 0) % GRADIENTS.length;
  return GRADIENTS[i] as [string, string];
}

// ── CommunityCard ─────────────────────────────────────────────────────────────

function CommunityCard({
  community, isMine, onJoin, onLeave,
}: {
  community: Community;
  isMine:    boolean;
  onJoin:    () => void;
  onLeave:   () => void;
}) {
  const navigate  = useNavigate();
  const count     = community.members_count ?? community.member_count ?? 0;
  const [g1, g2]  = gradientFor(community.name);

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.015] hover:shadow-lg"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      onClick={() => navigate(`/communities/${encodeId(community.id)}`)}
    >
      {/* Bannière */}
      <div className="relative" style={{ height: 110 }}>
        {community.banner_url
          ? <img src={community.banner_url} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }} />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />

        {community.is_private && (
          <span className="absolute top-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <Lock size={9} /> Privée
          </span>
        )}
        <span className="absolute top-2 right-2 flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <Users size={9} /> {fmtCount(count)}
        </span>
      </div>

      {/* Corps */}
      <div className="px-3.5 pb-3.5">
        {/* Avatar flottant */}
        <div className="relative" style={{ marginTop: -20, marginBottom: 8 }}>
          {community.avatar_url
            ? <img src={community.avatar_url}
                className="w-10 h-10 rounded-xl object-cover"
                style={{ border: '3px solid var(--surface)' }} alt="" />
            : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base"
                style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, border: '3px solid var(--surface)' }}>
                {community.name[0]?.toUpperCase()}
              </div>
          }
        </div>

        <div className="mb-2.5">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{community.name}</p>
            {community.is_verified && <BadgeCheck size={13} color="#1D9BF0" />}
          </div>
          {community.creator && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              par {community.creator.display_name ?? community.creator.username}
            </p>
          )}
          {community.description && (
            <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {community.description}
            </p>
          )}
        </div>

        {isMine ? (
          <div className="flex gap-2">
            <button
              onClick={e => { e.stopPropagation(); navigate(`/communities/${encodeId(community.id)}`); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'var(--primary)' }}>
              <MessageCircle size={13} /> Ouvrir
            </button>
            <button
              onClick={e => { e.stopPropagation(); onLeave(); }}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onJoin(); }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white"
            style={{ background: `linear-gradient(90deg, ${g1}, ${g2})` }}>
            <UserPlus size={13} /> Rejoindre
          </button>
        )}
      </div>
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
  const [tab,        setTab]        = useState<'discover' | 'mine'>('discover');
  const [all,        setAll]        = useState<Community[]>([]);
  const [query,      setQuery]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { confirm, ConfirmDialog }  = useConfirm();

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
      {/* Header */}
      <div className="shrink-0 px-5 pt-5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Communautés</h1>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--primary)' }}>
            <Plus size={15} /> Créer
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

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <PageLoader />
        ) : communities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(123,63,242,0.12)' }}>
              <Users size={34} color="#7B3FF2" />
            </div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              {tab === 'mine' ? 'Aucune communauté' : query ? 'Aucun résultat' : 'Aucune communauté'}
            </p>
            <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
              {tab === 'mine'
                ? 'Créez ou rejoignez une communauté'
                : query ? `Aucun résultat pour "${query}"` : 'Soyez le premier à créer !'}
            </p>
            {tab === 'mine' && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm"
                style={{ background: 'linear-gradient(90deg, #7B3FF2, #5B2EC4)' }}>
                <Plus size={16} /> Créer une communauté
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.map(c => (
                <CommunityCard key={c.id} community={c} isMine={tab === 'mine'}
                  onJoin={() => handleJoin(c.id)} onLeave={() => handleLeave(c.id)} />
              ))}
            </div>
            {hasMore && !query && tab === 'discover' && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => load(false)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  {loadingMore ? <Spinner size="sm" /> : 'Charger plus'}
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
