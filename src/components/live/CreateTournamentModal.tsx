import { useRef, useState } from 'react';
import { X, Check, ImagePlus, Loader2 } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../ui/Spinner';
import { tournamentsApi, type Tournament, type TournamentType, type TournamentRegistrationMode } from '../../api/tournaments';

const FORMATS: Array<8 | 16 | 32 | 64> = [8, 16, 32, 64];

const DURATIONS: { value: number; label: string }[] = [
  { value: 90,  label: '1min30' },
  { value: 180, label: '3min' },
  { value: 300, label: '5min' },
  { value: 600, label: '10min' },
];

const TYPES: { value: TournamentType; label: string; hint: string }[] = [
  { value: 'single_elimination', label: 'Élimination directe', hint: 'Une défaite = éliminé' },
  { value: 'double_elimination', label: 'Double élimination', hint: 'Deux défaites pour être éliminé' },
  { value: 'group_stage',        label: 'Phase de groupes',    hint: 'Groupes puis bracket final' },
  { value: 'league',             label: 'Ligue',                hint: "Tout le monde s'affronte" },
];

const REGISTRATION_MODES: { value: TournamentRegistrationMode; label: string; hint: string }[] = [
  { value: 'open',        label: 'Ouvert',     hint: 'Rejoint directement' },
  { value: 'approval',    label: 'Validation', hint: 'Tu valides chaque demande' },
  { value: 'invite_only', label: 'Invitation', hint: 'Uniquement via code' },
];

const COUNTRIES: { code: string; label: string }[] = [
  { code: 'CI', label: "Côte d'Ivoire" }, { code: 'SN', label: 'Sénégal' }, { code: 'FR', label: 'France' },
  { code: 'CM', label: 'Cameroun' }, { code: 'ML', label: 'Mali' }, { code: 'BF', label: 'Burkina Faso' },
  { code: 'BJ', label: 'Bénin' }, { code: 'TG', label: 'Togo' }, { code: 'GN', label: 'Guinée' },
  { code: 'CD', label: 'RD Congo' }, { code: 'CG', label: 'Congo' }, { code: 'GA', label: 'Gabon' },
  { code: 'MA', label: 'Maroc' }, { code: 'DZ', label: 'Algérie' }, { code: 'TN', label: 'Tunisie' },
  { code: 'US', label: 'États-Unis' }, { code: 'CA', label: 'Canada' }, { code: 'BE', label: 'Belgique' },
];

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'fr', label: 'Français' }, { code: 'en', label: 'Anglais' }, { code: 'es', label: 'Espagnol' },
  { code: 'ar', label: 'Arabe' }, { code: 'pt', label: 'Portugais' },
];

const TIMEZONES = [
  'Africa/Abidjan', 'Africa/Dakar', 'Africa/Lagos', 'Africa/Casablanca', 'Africa/Kinshasa',
  'Europe/Paris', 'Europe/Brussels', 'America/New_York', 'America/Toronto', 'UTC',
];

const STEPS = ['Informations', 'Accès', 'Calendrier', 'Règles & sponsor'];

async function uploadImage(file: File, folder: string): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiClient.upload<{ uploaded: { url: string }[] }>(Endpoints.upload.images(folder), fd);
    return res.data.uploaded?.[0]?.url ?? (res.data as any).url ?? null;
  } catch { return null; }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (tournament: Tournament) => void;
}

export function CreateTournamentModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tournamentType, setTournamentType] = useState<TournamentType>('single_elimination');
  const [format, setFormat] = useState<8 | 16 | 32 | 64>(8);
  const [battleDurationSeconds, setBattleDurationSeconds] = useState(180);
  const [prize, setPrize] = useState('');

  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [registrationMode, setRegistrationMode] = useState<TournamentRegistrationMode>('open');
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([]);
  const [entryFeeGogold, setEntryFeeGogold] = useState('');

  const [timezone, setTimezone] = useState('');
  const [scheduledStartAt, setScheduledStartAt] = useState('');
  const [registrationClosesAt, setRegistrationClosesAt] = useState('');

  const [rules, setRules] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep(0); setName(''); setDescription(''); setImageUrl(null);
    setTournamentType('single_elimination'); setFormat(8); setBattleDurationSeconds(180); setPrize('');
    setIsPrivate(false); setPassword(''); setRegistrationMode('open');
    setAllowedCountries([]); setAllowedLanguages([]);
    setTimezone(''); setScheduledStartAt(''); setRegistrationClosesAt('');
    setRules(''); setSponsorName(''); setSponsorLogoUrl(null); setEntryFeeGogold('');
    setError(null);
  }

  function close() { onClose(); reset(); }

  function toggleIn(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>, kind: 'banner' | 'logo') {
    const file = e.target.files?.[0];
    if (!file) return;
    if (kind === 'banner') setUploadingImage(true); else setUploadingLogo(true);
    const url = await uploadImage(file, 'tournaments');
    if (kind === 'banner') { setImageUrl(url); setUploadingImage(false); }
    else { setSponsorLogoUrl(url); setUploadingLogo(false); }
  }

  async function handleCreate() {
    if (!name.trim() || creating) return;
    if (isPrivate && !password.trim()) {
      setError('Un tournoi privé nécessite un mot de passe.');
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const t = await tournamentsApi.create({
        name: name.trim(),
        format,
        battleDurationSeconds,
        imageUrl: imageUrl ?? undefined,
        prize: prize.trim() || undefined,
        tournamentType,
        description: description.trim() || undefined,
        isPrivate,
        password: isPrivate ? password.trim() : undefined,
        registrationMode,
        allowedCountries: allowedCountries.length > 0 ? allowedCountries : undefined,
        allowedLanguages: allowedLanguages.length > 0 ? allowedLanguages : undefined,
        timezone: timezone || undefined,
        scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt).toISOString() : undefined,
        registrationClosesAt: registrationClosesAt ? new Date(registrationClosesAt).toISOString() : undefined,
        rules: rules.trim() || undefined,
        sponsorName: sponsorName.trim() || undefined,
        sponsorLogoUrl: sponsorLogoUrl ?? undefined,
        entryFeeGogold: entryFeeGogold.trim() ? parseInt(entryFeeGogold, 10) : 0,
      });
      onCreated(t);
      close();
    } catch (e: any) {
      setError(e?.message ?? 'Une erreur est survenue.');
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-6" onClick={close}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col" style={{ background: 'var(--surface)', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="w-9 h-1 rounded-full mx-auto mt-3 sm:hidden" style={{ background: 'var(--border)' }} />

        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <p className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Créer un tournoi</p>
          <button onClick={close} style={{ color: 'var(--text-secondary)' }}><X size={20} /></button>
        </div>

        <div className="flex gap-1.5 px-5 mb-3 shrink-0">
          {STEPS.map((label, i) => (
            <button key={label} onClick={() => setStep(i)} className="flex-1 flex flex-col items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: i === step ? '#9B65F5' : 'var(--border)' }} />
              <span className="text-[10px] font-bold text-center truncate w-full" style={{ color: i === step ? '#9B65F5' : 'var(--text-tertiary)' }}>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-0">
          {step === 0 && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide mb-1.5" style={{ color: 'var(--text-tertiary)' }}>BANNIÈRE</p>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePickImage(e, 'banner')} />
                <button onClick={() => imageInputRef.current?.click()}
                  className="w-full h-28 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden relative"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  {uploadingImage ? <Loader2 className="animate-spin" size={20} color="var(--text-tertiary)" />
                    : imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" />
                    : <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}><ImagePlus size={16} /> Ajouter une image</span>}
                </button>
              </div>

              <input className="input text-sm" placeholder="Nom du tournoi" value={name} maxLength={200} onChange={e => setName(e.target.value)} />
              <textarea className="input text-sm min-h-[70px]" placeholder="Description (optionnel)" value={description} maxLength={1000} onChange={e => setDescription(e.target.value)} />

              <p className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--text-tertiary)' }}>TYPE DE TOURNOI</p>
              <div className="flex flex-col gap-2">
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setTournamentType(t.value)}
                    className="flex items-center gap-2.5 rounded-2xl border-[1.5px] p-3.5 text-left"
                    style={{ borderColor: tournamentType === t.value ? '#9B65F5' : 'var(--border)', background: tournamentType === t.value ? 'rgba(155,101,245,0.09)' : 'var(--bg-secondary)' }}>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t.hint}</p>
                    </div>
                    {tournamentType === t.value && <Check size={18} color="#9B65F5" />}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-bold tracking-wide mt-1" style={{ color: 'var(--text-tertiary)' }}>NOMBRE DE PARTICIPANTS</p>
              <div className="flex gap-2">
                {FORMATS.map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className="flex-1 py-2.5 rounded-xl border-[1.5px] text-sm font-bold"
                    style={{ borderColor: format === f ? '#9B65F5' : 'var(--border)', background: format === f ? 'rgba(155,101,245,0.13)' : 'var(--bg-secondary)', color: format === f ? '#9B65F5' : 'var(--text-secondary)' }}>
                    {f}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-bold tracking-wide mt-1" style={{ color: 'var(--text-tertiary)' }}>DURÉE DE CHAQUE MATCH</p>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d.value} onClick={() => setBattleDurationSeconds(d.value)}
                    className="flex-1 py-2.5 rounded-xl border-[1.5px] text-sm font-bold"
                    style={{ borderColor: battleDurationSeconds === d.value ? '#9B65F5' : 'var(--border)', background: battleDurationSeconds === d.value ? 'rgba(155,101,245,0.13)' : 'var(--bg-secondary)', color: battleDurationSeconds === d.value ? '#9B65F5' : 'var(--text-secondary)' }}>
                    {d.label}
                  </button>
                ))}
              </div>

              <input className="input text-sm" placeholder="Récompense (ex: 500 GoGold)" value={prize} maxLength={200} onChange={e => setPrize(e.target.value)} />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 rounded-2xl border p-3.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-4 h-4 accent-[#9B65F5]" />
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Tournoi privé</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Nécessite un mot de passe pour rejoindre</p>
                </div>
              </label>
              {isPrivate && (
                <input type="password" className="input text-sm" placeholder="Mot de passe du tournoi" value={password} onChange={e => setPassword(e.target.value)} />
              )}

              <p className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--text-tertiary)' }}>MODE D'INSCRIPTION</p>
              <div className="flex flex-col gap-2">
                {REGISTRATION_MODES.map(m => (
                  <button key={m.value} onClick={() => setRegistrationMode(m.value)}
                    className="flex items-center gap-2.5 rounded-2xl border-[1.5px] p-3.5 text-left"
                    style={{ borderColor: registrationMode === m.value ? '#9B65F5' : 'var(--border)', background: registrationMode === m.value ? 'rgba(155,101,245,0.09)' : 'var(--bg-secondary)' }}>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{m.hint}</p>
                    </div>
                    {registrationMode === m.value && <Check size={18} color="#9B65F5" />}
                  </button>
                ))}
              </div>
              {registrationMode === 'invite_only' && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Un code d'invitation sera généré automatiquement à la création.</p>
              )}

              <p className="text-[11px] font-bold tracking-wide mt-1" style={{ color: 'var(--text-tertiary)' }}>PAYS AUTORISÉS — VIDE = TOUS</p>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRIES.map(c => (
                  <button key={c.code} onClick={() => toggleIn(allowedCountries, c.code, setAllowedCountries)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{ borderColor: allowedCountries.includes(c.code) ? '#9B65F5' : 'var(--border)', background: allowedCountries.includes(c.code) ? 'rgba(155,101,245,0.15)' : 'var(--bg-secondary)', color: allowedCountries.includes(c.code) ? '#9B65F5' : 'var(--text-secondary)' }}>
                    {c.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-bold tracking-wide mt-1" style={{ color: 'var(--text-tertiary)' }}>LANGUES AUTORISÉES — VIDE = TOUTES</p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => toggleIn(allowedLanguages, l.code, setAllowedLanguages)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{ borderColor: allowedLanguages.includes(l.code) ? '#9B65F5' : 'var(--border)', background: allowedLanguages.includes(l.code) ? 'rgba(155,101,245,0.15)' : 'var(--bg-secondary)', color: allowedLanguages.includes(l.code) ? '#9B65F5' : 'var(--text-secondary)' }}>
                    {l.label}
                  </button>
                ))}
              </div>

              <input className="input text-sm mt-1" inputMode="numeric" placeholder="Frais d'inscription en GoGold (0 = gratuit)"
                value={entryFeeGogold} onChange={e => setEntryFeeGogold(e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide mb-1.5" style={{ color: 'var(--text-tertiary)' }}>FUSEAU HORAIRE</p>
                <select className="input text-sm" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  <option value="">Sélectionner un fuseau horaire</option>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>

              <div>
                <p className="text-[11px] font-bold tracking-wide mb-1.5" style={{ color: 'var(--text-tertiary)' }}>FIN DES INSCRIPTIONS</p>
                <input type="datetime-local" className="input text-sm" value={registrationClosesAt} onChange={e => setRegistrationClosesAt(e.target.value)} />
              </div>

              <div>
                <p className="text-[11px] font-bold tracking-wide mb-1.5" style={{ color: 'var(--text-tertiary)' }}>DÉBUT DES MATCHS PRÉVU</p>
                <input type="datetime-local" className="input text-sm" value={scheduledStartAt} onChange={e => setScheduledStartAt(e.target.value)} />
              </div>

              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Des rappels seront envoyés aux participants avant chaque étape clé.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <textarea className="input text-sm min-h-[90px]" placeholder="Règlement du tournoi (optionnel)" value={rules} maxLength={2000} onChange={e => setRules(e.target.value)} />
              <input className="input text-sm" placeholder="Nom du sponsor (optionnel)" value={sponsorName} maxLength={150} onChange={e => setSponsorName(e.target.value)} />

              <div>
                <p className="text-[11px] font-bold tracking-wide mb-1.5" style={{ color: 'var(--text-tertiary)' }}>LOGO DU SPONSOR</p>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePickImage(e, 'logo')} />
                <button onClick={() => logoInputRef.current?.click()}
                  className="w-full h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  {uploadingLogo ? <Loader2 className="animate-spin" size={18} color="var(--text-tertiary)" />
                    : sponsorLogoUrl ? <img src={sponsorLogoUrl} className="h-full object-contain" />
                    : <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}><ImagePlus size={16} /> Ajouter un logo</span>}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm mt-3" style={{ color: '#EF4444' }}>{error}</p>}
        </div>

        <div className="flex gap-2.5 px-5 py-4 shrink-0 border-t" style={{ borderColor: 'var(--border)' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl py-3 border-[1.5px] text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Retour
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !name.trim()}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: '#9B65F5' }}>
              Suivant
            </button>
          ) : (
            <button onClick={handleCreate} disabled={!name.trim() || creating}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white flex items-center justify-center disabled:opacity-50" style={{ background: '#9B65F5' }}>
              {creating ? <Spinner size="sm" /> : 'Créer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
