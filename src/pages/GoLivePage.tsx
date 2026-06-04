import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { Radio, Video, Calendar, Zap, ChevronRight, Clock, Music, Globe, Lock } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import type { LiveStartResponse } from '../types';

// ── Carte de choix ────────────────────────────────────────────────────────────

function ChoiceCard({
  icon, title, description, badge, onClick, color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left group transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = color;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 24px ${color}30`;
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${color}20` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-[var(--text-primary)] text-lg">{title}</p>
            {badge && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${color}20`, color }}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
        </div>
        <ChevronRight size={20} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
      </div>
    </button>
  );
}

// ── Formulaire live spontané ──────────────────────────────────────────────────

function QuickLiveForm({ onBack }: { onBack: () => void }) {
  const navigate    = useNavigate();
  const [title,     setTitle]     = useState('');
  const [desc,      setDesc]      = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleStart() {
    if (!title.trim()) { setError('Donne un titre à ton live'); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await apiClient.post<LiveStartResponse>(Endpoints.lives.start, {
        title:       title.trim(),
        description: desc.trim() || null,
        is_private:  isPrivate,
      });
      // Redirige vers la page live avec le token publisher en state
      navigate(`/lives/${encodeId(r.data.live.id)}`, {
        state: {
          publisherToken: r.data.token,
          livekitUrl:     r.data.livekit_url,
          roomName:       r.data.room_name,
        },
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Impossible de démarrer le live');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
        ← Retour
      </button>

      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Démarrer un live</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Tu seras en direct immédiatement après avoir cliqué sur Démarrer.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Titre *</label>
          <input
            className="input mt-1 w-full"
            placeholder="Ex: Q&A avec ma communauté, Session freestyle..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            autoFocus
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">{title.length}/120</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Description (optionnel)</label>
          <textarea
            className="input mt-1 w-full resize-none"
            placeholder="De quoi va parler ton live ?"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            maxLength={300}
          />
        </div>
      </div>

      {/* Sélecteur visibilité */}
      <div>
        <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2 block">
          Visibilité
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsPrivate(false)}
            className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
            style={{
              borderColor:   !isPrivate ? '#10B981'                    : 'var(--border)',
              background:    !isPrivate ? 'rgba(16,185,129,0.08)'      : 'var(--bg-secondary)',
              boxShadow:     !isPrivate ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
            }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: !isPrivate ? 'rgba(16,185,129,0.15)' : 'var(--bg-tertiary)' }}>
              <Globe size={16} style={{ color: !isPrivate ? '#10B981' : 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: !isPrivate ? '#10B981' : 'var(--text-primary)' }}>Public</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tout le monde</p>
            </div>
            {!isPrivate && <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#10B981' }}>
              <span className="text-white text-[9px] font-black">✓</span>
            </div>}
          </button>

          <button
            type="button"
            onClick={() => setIsPrivate(true)}
            className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
            style={{
              borderColor:   isPrivate ? '#7B3FF2'                    : 'var(--border)',
              background:    isPrivate ? 'rgba(123,63,242,0.08)'      : 'var(--bg-secondary)',
              boxShadow:     isPrivate ? '0 0 0 3px rgba(123,63,242,0.15)' : 'none',
            }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isPrivate ? 'rgba(123,63,242,0.15)' : 'var(--bg-tertiary)' }}>
              <Lock size={16} style={{ color: isPrivate ? '#7B3FF2' : 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: isPrivate ? '#7B3FF2' : 'var(--text-primary)' }}>Abonnés</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tes abonnés seulement</p>
            </div>
            {isPrivate && <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#7B3FF2' }}>
              <span className="text-white text-[9px] font-black">✓</span>
            </div>}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="pt-2 flex gap-3">
        <button onClick={onBack} className="btn-ghost flex-1">Annuler</button>
        <button onClick={handleStart} disabled={loading || !title.trim()}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>
          {loading ? <Spinner size="sm" /> : <Radio size={16} />}
          {loading ? 'Démarrage...' : 'Démarrer le live'}
        </button>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function GoLivePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'choice' | 'quick-live'>('choice');

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 8px 32px rgba(240,54,90,0.35)' }}>
          <Radio size={28} color="white" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Passer en direct</h1>
        <p className="text-sm text-[var(--text-secondary)]">Choisis le type de live que tu veux démarrer</p>
      </div>

      {step === 'choice' ? (
        <div className="space-y-4">

          {/* Live spontané */}
          <ChoiceCard
            icon={<Video size={24} />}
            title="Live spontané"
            description="Démarre immédiatement. Parle à ta communauté en temps réel, sans préparation."
            badge="Immédiat"
            color="#F0365A"
            onClick={() => setStep('quick-live')}
          />

          {/* Concert live */}
          <ChoiceCard
            icon={<Music size={24} />}
            title="Concert live"
            description="Crée un concert programmé avec billetterie, replay, et mise en avant dans les événements."
            badge="Programmé"
            color="#7B3FF2"
            onClick={() => navigate('/concerts/new')}
          />

          {/* Séparateur */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg)] px-3">ou</span>
            </div>
          </div>

          {/* Raccourcis */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/live')}
              className="card p-4 text-left hover:border-brand-primary transition-colors group">
              <Clock size={20} className="text-[var(--text-tertiary)] group-hover:text-brand-primary transition-colors mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Lives en cours</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Voir les streams actifs</p>
            </button>

            <button onClick={() => navigate('/lives')}
              className="card p-4 text-left hover:border-[#F0365A] transition-colors group">
              <Zap size={20} className="text-[var(--text-tertiary)] group-hover:text-[#F0365A] transition-colors mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Lives spontanés</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Voir tous les lives</p>
            </button>
          </div>
        </div>
      ) : (
        <QuickLiveForm onBack={() => setStep('choice')} />
      )}
    </div>
  );
}
