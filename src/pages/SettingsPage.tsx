import { useState } from 'react';
import type { FormEvent } from 'react';
import { Lock, Eye, EyeOff, Shield, Palette, Sun, Moon, CheckCircle, AlertCircle, User } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section style={{ borderRadius: '1rem', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
          {icon}
        </div>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { user }    = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [pwForm,    setPwForm]    = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw,    setShowPw]    = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [focused,   setFocused]   = useState<string | null>(null);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('Les mots de passe ne correspondent pas');
      return;
    }
    setPwLoading(true); setPwError(''); setPwSuccess(false);
    try {
      await apiClient.post(Endpoints.auth.changePassword, {
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      setPwSuccess(true);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setPwLoading(false);
    }
  }

  const inputStyle = (name: string) => ({
    boxShadow:   focused === name ? '0 0 0 3px rgba(123,63,242,0.15)' : 'none',
    borderColor: focused === name ? 'var(--primary)' : 'var(--border)',
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Paramètres</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Gérez votre compte et vos préférences</p>
      </div>

      {/* Apparence */}
      <Section icon={<Palette size={16} />} title="Apparence">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Thème de l'interface</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Actuellement en mode {isDark ? 'sombre' : 'clair'}
            </p>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div className={`relative w-9 h-5 rounded-full transition-colors`}
              style={{ background: isDark ? 'var(--primary)' : 'var(--border)' }}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            {isDark ? <Sun size={15} style={{ color: 'var(--text-secondary)' }} /> : <Moon size={15} style={{ color: 'var(--text-secondary)' }} />}
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isDark ? 'Mode clair' : 'Mode sombre'}
            </span>
          </button>
        </div>
      </Section>

      {/* Mot de passe */}
      <Section icon={<Lock size={16} />} title="Sécurité">
        <form onSubmit={changePassword} className="space-y-4">
          {pwError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(240,54,90,0.08)', border: '1px solid rgba(240,54,90,0.25)', color: '#F0365A' }}>
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
              <CheckCircle size={15} className="shrink-0 mt-0.5" />
              Mot de passe modifié avec succès !
            </div>
          )}

          {[
            { key: 'current_password', label: 'Mot de passe actuel' },
            { key: 'new_password',     label: 'Nouveau mot de passe' },
            { key: 'confirm',          label: 'Confirmer le nouveau mot de passe' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {label}
              </label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  value={pwForm[key as keyof typeof pwForm]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  onFocus={() => setFocused(key)}
                  onBlur={() => setFocused(null)}
                  required
                  minLength={key !== 'current_password' ? 8 : undefined}
                  style={inputStyle(key)}
                />
                {key === 'confirm' && (
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="submit" disabled={pwLoading} className="btn-primary gap-2">
            {pwLoading ? (
              <>
                <span className="inline-flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                      style={{ animation: `blink 1s ${i*0.15}s infinite` }} />
                  ))}
                </span>
                Modification…
              </>
            ) : (
              <><Lock size={14} /> Modifier le mot de passe</>
            )}
          </button>
        </form>
      </Section>

      {/* Compte */}
      <Section icon={<Shield size={16} />} title="Informations du compte">
        <div className="space-y-3">
          {[
            { label: 'Email',    value: user?.email },
            { label: 'Rôle',     value: user?.role },
            { label: 'Statut',   value: user?.is_active ? 'Actif' : 'Inactif', highlight: user?.is_active ? '#22c55e' : '#F0365A' },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="flex items-center justify-between py-2.5 px-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span className="text-sm font-medium capitalize" style={{ color: highlight ?? 'var(--text-primary)' }}>
                {value ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Profile info */}
      <Section icon={<User size={16} />} title="Profil">
        <div className="space-y-3">
          {[
            { label: 'Nom d\'affichage', value: user?.display_name },
            { label: 'Nom d\'utilisateur', value: user?.username ? `@${user.username}` : undefined },
            { label: 'Prénom', value: user?.first_name },
            { label: 'Nom', value: user?.last_name },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</span>
            </div>
          ))}
          <p className="text-xs pt-2" style={{ color: 'var(--text-tertiary)' }}>
            Pour modifier votre profil, rendez-vous sur la page <a href="/profile" style={{ color: 'var(--primary)' }}>Mon profil</a>.
          </p>
        </div>
      </Section>

    </div>
  );
}
