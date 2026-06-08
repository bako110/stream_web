import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Activity, MapPin, Phone, Gift, MessageCircle, Wifi } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';

interface PrivacySettings {
  privacy_profile_public:  boolean;
  privacy_show_activity:   boolean;
  privacy_show_location:   boolean;
  privacy_allow_messages:  boolean;
  privacy_show_online:     boolean;
  privacy_show_phone:      boolean;
  privacy_show_birthday:   boolean;
}

const DEFAULTS: PrivacySettings = {
  privacy_profile_public:  true,
  privacy_show_activity:   true,
  privacy_show_location:   true,
  privacy_allow_messages:  true,
  privacy_show_online:     true,
  privacy_show_phone:      false,
  privacy_show_birthday:   true };

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className="relative rounded-full transition-colors shrink-0 disabled:opacity-50"
      style={{ width: 44, height: 24, background: value ? 'var(--primary)' : 'var(--border)' }}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SettingRow({ icon, label, desc, color, field, settings, saving, onToggle, last }: {
  icon: React.ReactNode; label: string; desc?: string; color?: string;
  field: keyof PrivacySettings; settings: PrivacySettings;
  saving: keyof PrivacySettings | null; onToggle: (f: keyof PrivacySettings) => (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color ?? 'var(--primary)'}18`, color: color ?? 'var(--primary)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>}
      </div>
      {saving === field
        ? <Spinner size="sm" />
        : <Toggle value={settings[field]} onChange={onToggle(field)} />
      }
    </div>
  );
}

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<keyof PrivacySettings | null>(null);
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULTS);
  const settingsRef = useRef<PrivacySettings>(DEFAULTS);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    apiClient.get<PrivacySettings>(Endpoints.users.privacy)
      .then(res => {
        const s = { ...DEFAULTS, ...res.data };
        setSettings(s); settingsRef.current = s;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onToggle = useCallback((field: keyof PrivacySettings) => async (val: boolean) => {
    const prev = settingsRef.current;
    const next: PrivacySettings = { ...prev, [field]: val };
    setSettings(next); settingsRef.current = next;
    setSaving(field);
    try {
      const res = await apiClient.put<PrivacySettings>(Endpoints.users.privacy, next);
      const s = { ...DEFAULTS, ...res.data };
      setSettings(s); settingsRef.current = s;
    } catch {
      setSettings(prev); settingsRef.current = prev;
    } finally { setSaving(null); }
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Confidentialité</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Contrôlez ce que les autres voient</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl" style={{ background: 'var(--bg-secondary)' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded-lg w-2/5" style={{ background: 'var(--bg-secondary)' }} />
                <div className="h-2.5 rounded-lg w-3/5" style={{ background: 'var(--bg-secondary)' }} />
              </div>
              <div className="w-11 h-6 rounded-full" style={{ background: 'var(--bg-secondary)' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Visibilité du profil */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>VISIBILITÉ DU PROFIL</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <SettingRow icon={<Eye size={16}/>}      label="Profil public"         desc="Tout le monde peut voir votre profil"  field="privacy_profile_public" settings={settings} saving={saving} onToggle={onToggle} />
              <SettingRow icon={<Activity size={16}/>} label="Afficher l'activité"   desc="Montrer vos événements récents"       field="privacy_show_activity"  settings={settings} saving={saving} onToggle={onToggle} />
              <SettingRow icon={<MapPin size={16}/>}   label="Afficher la localisation" desc="Montrer votre ville sur votre profil" field="privacy_show_location" settings={settings} saving={saving} onToggle={onToggle} last />
            </div>
          </div>

          {/* Informations personnelles */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>INFORMATIONS PERSONNELLES</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <SettingRow icon={<Phone size={16}/>} label="Afficher le téléphone"          desc="Visible sur votre profil public" color="#10B981" field="privacy_show_phone"    settings={settings} saving={saving} onToggle={onToggle} />
              <SettingRow icon={<Gift size={16}/>}  label="Afficher la date de naissance"  desc="Visible sur votre profil public" color="#7B3FF2" field="privacy_show_birthday" settings={settings} saving={saving} onToggle={onToggle} last />
            </div>
          </div>

          {/* Communication */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>COMMUNICATION</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <SettingRow icon={<MessageCircle size={16}/>} label="Autoriser les messages"    desc="Recevoir des messages de tout le monde"  color="#7B3FF2" field="privacy_allow_messages" settings={settings} saving={saving} onToggle={onToggle} />
              <SettingRow icon={<Wifi size={16}/>}          label="Afficher le statut en ligne" desc="Montrer quand vous êtes connecté(e)"   color="#7B3FF2" field="privacy_show_online"     settings={settings} saving={saving} onToggle={onToggle} last />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
