import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, Users, Eye, TrendingUp, PlayCircle,
  Check, X, Star, Clock, ShoppingBag, SlidersHorizontal,
  FileText, CalendarDays, Music2, Radio, History, Plus,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  BOOST_CATEGORIES, CUSTOM_UNITS, CUSTOM_REACH_CONFIG,
  computeCustomCoins, fmtNum,
  type BoostTier,
} from './boost/BoostCatalog';
import { ActiveBoostCard, type BoostRecord } from './boost/ActiveBoostCard';
import { ContentPicker, type TargetContent } from './boost/ContentPicker';

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'new' | 'active' | 'history';

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ReactNode> = {
  followers:     <Users size={20} />,
  profile_views: <Eye size={20} />,
  content_reach: <TrendingUp size={20} />,
  reel_views:    <PlayCircle size={20} />,
  post_reach:    <FileText size={20} />,
  event_reach:   <CalendarDays size={20} />,
  concert_reach: <Music2 size={20} />,
  live_viewers:  <Radio size={20} />,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function WalletBoostPage() {
  const navigate = useNavigate();

  // ── Global state ────────────────────────────────────────────────────────
  const [tab,           setTab]           = useState<Tab>('new');
  const [balance,       setBalance]       = useState(0);
  const [activeBoosts,  setActiveBoosts]  = useState<BoostRecord[]>([]);
  const [historyBoosts, setHistoryBoosts] = useState<BoostRecord[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingHistory,setLoadingHistory]= useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // ── New boost state ──────────────────────────────────────────────────────
  const [catIdx,        setCatIdx]        = useState(0);
  const [selectedTier,  setSelectedTier]  = useState<BoostTier | null>(null);
  const [targetContent, setTargetContent] = useState<TargetContent | null>(null);
  const [customMode,    setCustomMode]    = useState(false);
  const [customReach,   setCustomReach]   = useState(500);
  const [customDays,    setCustomDays]    = useState(7);
  const [showModal,     setShowModal]     = useState(false);
  const [purchasing,    setPurchasing]    = useState(false);
  const [success,       setSuccess]       = useState(false);

  const cat    = BOOST_CATEGORIES[catIdx];
  const [g1, g2] = cat.gradient;
  const icon   = ICONS[cat.id] ?? <Zap size={20} />;

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get<{ coins_balance: number }>(Endpoints.wallet.balance)
      .then(r => setBalance(r.data?.coins_balance ?? 0))
      .catch(() => {});
    apiClient.get<any>(`/api/v1/wallet/boosts/active`)
      .then(r => setActiveBoosts(Array.isArray(r.data) ? r.data : r.data?.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingActive(false));
  }, []);

  // Load history lazily
  useEffect(() => {
    if (tab !== 'history' || historyLoaded) return;
    setLoadingHistory(true);
    apiClient.get<any>(`/api/v1/wallet/boosts/history?limit=50`)
      .then(r => setHistoryBoosts(Array.isArray(r.data) ? r.data : r.data?.items ?? []))
      .catch(() => {})
      .finally(() => { setLoadingHistory(false); setHistoryLoaded(true); });
  }, [tab, historyLoaded]);

  // ── Category select ──────────────────────────────────────────────────────
  function selectCat(i: number) {
    if (i === catIdx) return;
    setCatIdx(i);
    setSelectedTier(null);
    setTargetContent(null);
    setCustomMode(false);
    const cfg = CUSTOM_REACH_CONFIG[BOOST_CATEGORIES[i].id];
    if (cfg) setCustomReach(cfg.presets[0] ?? cfg.min);
  }

  // ── Tier / custom select ─────────────────────────────────────────────────
  function handleSelectTier(tier: BoostTier) {
    if (cat.contentType && !targetContent) {
      toast.error('Sélectionnez d\'abord un contenu à booster.');
      return;
    }
    if (balance < tier.coins) {
      toast.error('Solde insuffisant. Achetez des coins d\'abord.');
      return;
    }
    setSelectedTier(tier);
    setShowModal(true);
  }

  const reachCfg    = CUSTOM_REACH_CONFIG[cat.id] ?? CUSTOM_REACH_CONFIG['content_reach'];
  const customCoins = computeCustomCoins(cat.id, customReach, customDays);
  const customUnit  = CUSTOM_UNITS[cat.id] ?? 'unités';

  function handleSelectCustom() {
    if (cat.contentType && !targetContent) {
      toast.error('Sélectionnez d\'abord un contenu à booster.');
      return;
    }
    if (balance < customCoins) { toast.error('Solde insuffisant.'); return; }
    setSelectedTier({
      id: 'custom', label: 'Custom',
      quantity: `${fmtNum(customReach)} ${customUnit}`,
      quantity_num: customReach,
      duration: `${customDays} jour${customDays > 1 ? 's' : ''}`,
      duration_days: customDays,
      coins: customCoins,
    });
    setShowModal(true);
  }

  // ── Confirm purchase ─────────────────────────────────────────────────────
  async function confirmBoost() {
    if (!selectedTier) return;
    setPurchasing(true);
    try {
      const payload: Record<string, unknown> = {
        boost_option_id: cat.id,
        tier_id: selectedTier.id,
        coins_amount: selectedTier.coins,
      };
      if (selectedTier.id === 'custom') {
        payload.custom_reach    = customReach;
        payload.custom_duration = customDays;
      }
      if (targetContent) {
        payload.target_content_id    = targetContent.id;
        payload.target_content_title = targetContent.title;
        if (cat.contentType) payload.target_content_type = cat.contentType;
      }
      const res = await apiClient.post<{ boost: BoostRecord; new_balance: number }>(
        Endpoints.wallet.boostsPurchase, payload,
      );
      setBalance(res.data?.new_balance ?? (balance - selectedTier.coins));
      if (res.data?.boost) setActiveBoosts(prev => [res.data.boost, ...prev]);
      setShowModal(false);
      setSelectedTier(null);
      setTargetContent(null);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setTab('active'); }, 2800);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Achat échoué. Réessayez.');
    } finally { setPurchasing(false); }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallet')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={17} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Booster</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Abonnés · Reels · Posts · Événements · Live
          </p>
        </div>
        <button onClick={() => navigate('/wallet/buy')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.2)' }}>
          <Zap size={13} style={{ color: 'var(--primary)' }} />
          <span className="text-xs font-black" style={{ color: 'var(--primary)' }}>
            {balance.toLocaleString('fr-FR')} coins
          </span>
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
        {([
          { key: 'new',     label: 'Nouveau boost', Icon: Plus,    badge: 0 },
          { key: 'active',  label: 'Actifs',        Icon: Zap,     badge: activeBoosts.length },
          { key: 'history', label: 'Historique',    Icon: History, badge: 0 },
        ] as const).map(({ key, label, Icon, badge }) => (
          <button key={key}
            onClick={() => setTab(key as Tab)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === key ? 'var(--surface)' : 'transparent',
              color: tab === key ? 'var(--primary)' : 'var(--text-tertiary)',
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
            <Icon size={13} />
            {label}
            {badge != null && badge > 0 && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: '#22C55E20', color: '#22C55E' }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Nouveau boost                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'new' && (
        <div className="space-y-5">

          {/* Category scroll */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-3 px-1"
              style={{ color: 'var(--text-tertiary)' }}>Type de boost</p>
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {BOOST_CATEGORIES.map((c, i) => {
                const active = i === catIdx;
                const [og1, og2] = c.gradient;
                return (
                  <button key={c.id} onClick={() => selectCat(i)}
                    className="relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all shrink-0"
                    style={{
                      background: active ? `linear-gradient(135deg,${og1}22,${og2}12)` : 'var(--surface)',
                      border: active ? `1.5px solid ${og1}70` : '1px solid var(--border)',
                      minWidth: 72,
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg,${og1},${og2})`, color: '#fff' }}>
                      {ICONS[c.id] ?? <Zap size={20} />}
                    </div>
                    <p className="text-[10px] font-black text-center leading-tight"
                      style={{ color: active ? og1 : 'var(--text-secondary)' }}>
                      {c.label}
                    </p>
                    {active && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: og1 }}>
                        <Check size={9} color="#fff" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description card */}
          <div className="rounded-2xl px-4 py-4 flex items-center gap-3"
            style={{ background: `linear-gradient(135deg,${g1}15,${g2}08)`, border: `1px solid ${g1}30` }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg,${g1},${g2})`, color: '#fff' }}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{cat.label}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{cat.description}</p>
            </div>
          </div>

          {/* Content picker (if needed) */}
          {cat.contentType && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider mb-2 px-1"
                style={{ color: 'var(--text-tertiary)' }}>Contenu à booster</p>
              <ContentPicker
                contentType={cat.contentType}
                targetLabel={cat.targetLabel ?? 'Choisir un contenu'}
                g1={g1}
                selected={targetContent}
                onSelect={setTargetContent}
              />
              {!targetContent && (
                <p className="text-[10px] mt-1.5 px-1" style={{ color: '#7B3FF2' }}>
                  Sélectionnez un contenu avant de choisir un pack
                </p>
              )}
            </div>
          )}

          {/* Toggle packs / custom */}
          <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
            <button onClick={() => { setCustomMode(false); setSelectedTier(null); }}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: !customMode ? 'var(--surface)' : 'transparent',
                color: !customMode ? g1 : 'var(--text-tertiary)',
                boxShadow: !customMode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
              Packs prédéfinis
            </button>
            <button onClick={() => { setCustomMode(true); setSelectedTier(null); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: customMode ? 'var(--surface)' : 'transparent',
                color: customMode ? g1 : 'var(--text-tertiary)',
                boxShadow: customMode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
              <SlidersHorizontal size={12} /> Personnaliser
            </button>
          </div>

          {/* ── Tiers grid ──────────────────────────────────────────────── */}
          {!customMode ? (
            <div className="grid grid-cols-2 gap-3">
              {cat.tiers.map(tier => {
                const afford  = balance >= tier.coins;
                const locked  = !!cat.contentType && !targetContent;
                const isSel   = selectedTier?.id === tier.id;
                return (
                  <button key={tier.id} onClick={() => handleSelectTier(tier)}
                    disabled={!afford || locked}
                    className="relative rounded-2xl p-4 text-left transition-all disabled:opacity-45"
                    style={{
                      background: isSel ? `linear-gradient(135deg,${g1}20,${g2}10)` : 'var(--surface)',
                      border: isSel ? `2px solid ${g1}` : '1px solid var(--border)',
                      boxShadow: isSel ? `0 4px 16px ${g1}25` : 'none',
                    }}>
                    {tier.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-[10px] font-black px-2.5 py-0.5 rounded-full text-white whitespace-nowrap"
                        style={{ background: `linear-gradient(135deg,${g1},${g2})` }}>
                        <Star size={8} /> POPULAIRE
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${g1}15`, color: g1 }}>
                        {tier.label}
                      </span>
                      {isSel && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: g1 }}>
                          <Check size={11} color="#fff" />
                        </div>
                      )}
                    </div>
                    <p className="text-lg font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {tier.quantity}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 mb-3">
                      <Clock size={10} style={{ color: 'var(--text-tertiary)' }} />
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{tier.duration}</p>
                    </div>
                    <div className="flex items-center gap-1.5 pt-3" style={{ borderTop: `1px solid ${g1}20` }}>
                      <Zap size={13} style={{ color: g1 }} />
                      <p className="text-sm font-black" style={{ color: g1 }}>
                        {tier.coins.toLocaleString('fr-FR')} coins
                      </p>
                    </div>
                    {!afford && <p className="text-[10px] mt-1" style={{ color: '#EF4444' }}>Solde insuffisant</p>}
                  </button>
                );
              })}
            </div>
          ) : (

            /* ── Custom panel ─────────────────────────────────────────── */
            <div className="rounded-2xl p-5 space-y-5"
              style={{ background: 'var(--surface)', border: `1px solid ${g1}25` }}>

              {/* Reach */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Portée souhaitée
                  </p>
                  <span className="text-base font-black" style={{ color: g1 }}>
                    {fmtNum(customReach)} <span className="text-xs font-semibold">{customUnit}</span>
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {reachCfg.presets.map(p => (
                    <button key={p} onClick={() => setCustomReach(p)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                      style={{ background: customReach === p ? g1 : `${g1}15`, color: customReach === p ? '#fff' : g1 }}>
                      {fmtNum(p)}
                    </button>
                  ))}
                </div>
                <input type="range"
                  min={reachCfg.min} max={reachCfg.max} step={reachCfg.step}
                  value={customReach}
                  onChange={e => setCustomReach(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: g1 }} />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{fmtNum(reachCfg.min)}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{fmtNum(reachCfg.max)}</span>
                </div>
              </div>

              {/* Days */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Durée
                  </p>
                  <span className="text-base font-black" style={{ color: g1 }}>
                    {customDays} <span className="text-xs font-semibold">jour{customDays > 1 ? 's' : ''}</span>
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {[1, 3, 7, 14, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => setCustomDays(d)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                      style={{ background: customDays === d ? g1 : `${g1}15`, color: customDays === d ? '#fff' : g1 }}>
                      {d}j
                    </button>
                  ))}
                </div>
                <input type="range" min={1} max={90} step={1}
                  value={customDays}
                  onChange={e => setCustomDays(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: g1 }} />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>1 jour</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>90 jours</span>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: `linear-gradient(135deg,${g1}12,${g2}08)`, border: `1px solid ${g1}20` }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    {fmtNum(customReach)} {customUnit} · {customDays} jour{customDays > 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    Solde après : {Math.max(0, balance - customCoins).toLocaleString('fr-FR')} coins
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black" style={{ color: g1 }}>{customCoins.toLocaleString('fr-FR')}</p>
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>coins</p>
                </div>
              </div>

              <button onClick={handleSelectCustom} disabled={balance < customCoins}
                className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                style={{
                  background: balance >= customCoins ? `linear-gradient(135deg,${g1},${g2})` : 'var(--bg-secondary)',
                  boxShadow: balance >= customCoins ? `0 6px 20px ${g1}35` : 'none',
                  color: balance >= customCoins ? '#fff' : 'var(--text-tertiary)',
                }}>
                <Zap size={15} />
                {balance >= customCoins ? `Booster pour ${customCoins.toLocaleString('fr-FR')} coins` : 'Solde insuffisant'}
              </button>
            </div>
          )}

          {/* Buy coins CTA */}
          {balance === 0 && (
            <button onClick={() => navigate('/wallet/buy')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <ShoppingBag size={18} style={{ color: 'var(--text-tertiary)' }} />
              <p className="flex-1 text-xs text-left" style={{ color: 'var(--text-secondary)' }}>
                Vous n'avez pas de coins. Achetez-en pour activer un boost.
              </p>
              <span className="text-xs font-black px-3 py-1.5 rounded-full text-white shrink-0"
                style={{ background: 'var(--primary)' }}>
                Acheter
              </span>
            </button>
          )}

          <p className="text-[11px] text-center px-6 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Les coins sont débités immédiatement. Remboursement de 50 % si vous annulez dans la première moitié de la durée. Les impressions sont comptées en temps réel dans votre tableau de bord.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Actifs                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'active' && (
        <div className="space-y-3">
          {loadingActive ? (
            <PageLoader />
          ) : activeBoosts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)' }}>
                <Zap size={28} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  Aucun boost actif
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Lancez votre premier boost depuis l'onglet "Nouveau boost"
                </p>
              </div>
              <button onClick={() => setTab('new')}
                className="px-5 py-2.5 rounded-xl text-sm font-black text-white"
                style={{ background: 'var(--primary)' }}>
                Créer un boost
              </button>
            </div>
          ) : (
            activeBoosts.map(b => (
              <ActiveBoostCard
                key={b.id}
                boost={b}
                onCancelled={(id, _refund, newBalance) => {
                  setActiveBoosts(prev => prev.filter(x => x.id !== id));
                  setBalance(newBalance);
                  setHistoryLoaded(false); // force reload history on next visit
                }}
              />
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Historique                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="space-y-3">
          {loadingHistory ? (
            <PageLoader />
          ) : historyBoosts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <History size={32} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                Aucun boost dans l'historique
              </p>
            </div>
          ) : (
            historyBoosts.map(b => <ActiveBoostCard key={b.id} boost={b} />)
          )}
        </div>
      )}

      {/* ── Confirm modal ───────────────────────────────────────────────── */}
      {showModal && selectedTier && (
        <>
          <div className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            onClick={() => !purchasing && setShowModal(false)} />
          <div className="fixed z-50 rounded-3xl p-6 space-y-5"
            style={{
              background: 'var(--surface)',
              inset: 'auto 1rem',
              top: '50%', transform: 'translateY(-50%)',
              maxWidth: 400, margin: '0 auto',
            }}>
            <div className="flex items-center justify-between">
              <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Confirmer le boost</p>
              <button onClick={() => !purchasing && setShowModal(false)}
                className="p-1.5 rounded-xl"
                style={{ color: 'var(--text-tertiary)', background: 'var(--bg-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${g1}30` }}>
              <div className="flex items-center gap-3 p-4"
                style={{ background: `linear-gradient(135deg,${g1}15,${g2}08)` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg,${g1},${g2})`, color: '#fff' }}>
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                    {cat.label} · {selectedTier.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {selectedTier.quantity} · {selectedTier.duration}
                  </p>
                  {targetContent && (
                    <p className="text-[10px] mt-0.5 truncate font-semibold" style={{ color: g1 }}>
                      {targetContent.title}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-2.5">
                {[
                  { label: 'Coût',              value: `${selectedTier.coins.toLocaleString('fr-FR')} coins`, color: g1 },
                  { label: 'Solde actuel',      value: `${balance.toLocaleString('fr-FR')} coins` },
                  { label: 'Solde restant',     value: `${(balance - selectedTier.coins).toLocaleString('fr-FR')} coins` },
                  { label: 'Remboursement',     value: `50 % si annulé avant mi-durée`, color: '#22C55E' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{row.label}</p>
                    <p className="text-xs font-black" style={{ color: row.color ?? 'var(--text-primary)' }}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} disabled={purchasing}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                Annuler
              </button>
              <button onClick={confirmBoost} disabled={purchasing}
                className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: `linear-gradient(135deg,${g1},${g2})`, boxShadow: `0 6px 20px ${g1}40` }}>
                {purchasing ? <Spinner size="sm" /> : <><Zap size={14} /> Activer</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Success overlay ─────────────────────────────────────────────── */}
      {success && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg,${g1},${g2})`, boxShadow: `0 0 60px ${g1}70` }}>
            <Check size={40} color="#fff" strokeWidth={3} />
          </div>
          <div className="text-center">
            <p className="text-white font-black text-2xl mb-1">Boost activé !</p>
            <p className="text-white/60 text-sm">Votre contenu apparaît plus souvent dans les feeds. Suivez les impressions en temps réel dans l'onglet Actifs.</p>
          </div>
        </div>
      )}
    </div>
  );
}
