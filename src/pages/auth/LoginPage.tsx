import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, Play, Music2, Calendar, Film, Radio, QrCode, Smartphone, Mail, ChevronDown } from 'lucide-react';
import { AppDownloadBar } from '../../components/ui/AppDownloadBar';
import { RoundLogo } from '../../components/ui/RoundLogo';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { googleOAuthPopup } from '../../utils/googleOAuth';
import QRLoginPanel from '../../components/auth/QRLoginPanel';
import { getSafeRedirect } from '../../utils/safeRedirect';
import { getApiErrorDetail, extractApiErrorMessage } from '../../utils/apiError';

declare global { interface Window { google?: any; } }
78659777
type LoginMethod = 'email' | 'phone';

// Pays les plus courants d'abord, puis le reste
const COUNTRIES = [
  { code: 'AF', dial: '+93',   flag: '🇦🇫', name: 'Afghanistan' },
  { code: 'ZA', dial: '+27',   flag: '🇿🇦', name: 'Afrique du Sud' },
  { code: 'AL', dial: '+355',  flag: '🇦🇱', name: 'Albanie' },
  { code: 'DZ', dial: '+213',  flag: '🇩🇿', name: 'Algérie' },
  { code: 'DE', dial: '+49',   flag: '🇩🇪', name: 'Allemagne' },
  { code: 'AD', dial: '+376',  flag: '🇦🇩', name: 'Andorre' },
  { code: 'AO', dial: '+244',  flag: '🇦🇴', name: 'Angola' },
  { code: 'AG', dial: '+1268', flag: '🇦🇬', name: 'Antigua-et-Barbuda' },
  { code: 'SA', dial: '+966',  flag: '🇸🇦', name: 'Arabie saoudite' },
  { code: 'AR', dial: '+54',   flag: '🇦🇷', name: 'Argentine' },
  { code: 'AM', dial: '+374',  flag: '🇦🇲', name: 'Arménie' },
  { code: 'AU', dial: '+61',   flag: '🇦🇺', name: 'Australie' },
  { code: 'AT', dial: '+43',   flag: '🇦🇹', name: 'Autriche' },
  { code: 'AZ', dial: '+994',  flag: '🇦🇿', name: 'Azerbaïdjan' },
  { code: 'BS', dial: '+1242', flag: '🇧🇸', name: 'Bahamas' },
  { code: 'BH', dial: '+973',  flag: '🇧🇭', name: 'Bahreïn' },
  { code: 'BD', dial: '+880',  flag: '🇧🇩', name: 'Bangladesh' },
  { code: 'BB', dial: '+1246', flag: '🇧🇧', name: 'Barbade' },
  { code: 'BE', dial: '+32',   flag: '🇧🇪', name: 'Belgique' },
  { code: 'BZ', dial: '+501',  flag: '🇧🇿', name: 'Belize' },
  { code: 'BJ', dial: '+229',  flag: '🇧🇯', name: 'Bénin' },
  { code: 'BT', dial: '+975',  flag: '🇧🇹', name: 'Bhoutan' },
  { code: 'BY', dial: '+375',  flag: '🇧🇾', name: 'Biélorussie' },
  { code: 'MM', dial: '+95',   flag: '🇲🇲', name: 'Birmanie (Myanmar)' },
  { code: 'BO', dial: '+591',  flag: '🇧🇴', name: 'Bolivie' },
  { code: 'BA', dial: '+387',  flag: '🇧🇦', name: 'Bosnie-Herzégovine' },
  { code: 'BW', dial: '+267',  flag: '🇧🇼', name: 'Botswana' },
  { code: 'BR', dial: '+55',   flag: '🇧🇷', name: 'Brésil' },
  { code: 'BN', dial: '+673',  flag: '🇧🇳', name: 'Brunei' },
  { code: 'BG', dial: '+359',  flag: '🇧🇬', name: 'Bulgarie' },
  { code: 'BF', dial: '+226',  flag: '🇧🇫', name: 'Burkina Faso' },
  { code: 'BI', dial: '+257',  flag: '🇧🇮', name: 'Burundi' },
  { code: 'KH', dial: '+855',  flag: '🇰🇭', name: 'Cambodge' },
  { code: 'CM', dial: '+237',  flag: '🇨🇲', name: 'Cameroun' },
  { code: 'CA', dial: '+1',    flag: '🇨🇦', name: 'Canada' },
  { code: 'CV', dial: '+238',  flag: '🇨🇻', name: 'Cap-Vert' },
  { code: 'CF', dial: '+236',  flag: '🇨🇫', name: 'République centrafricaine' },
  { code: 'CL', dial: '+56',   flag: '🇨🇱', name: 'Chili' },
  { code: 'CN', dial: '+86',   flag: '🇨🇳', name: 'Chine' },
  { code: 'CY', dial: '+357',  flag: '🇨🇾', name: 'Chypre' },
  { code: 'CO', dial: '+57',   flag: '🇨🇴', name: 'Colombie' },
  { code: 'KM', dial: '+269',  flag: '🇰🇲', name: 'Comores' },
  { code: 'CG', dial: '+242',  flag: '🇨🇬', name: 'Congo (Brazzaville)' },
  { code: 'CD', dial: '+243',  flag: '🇨🇩', name: 'Congo (RDC)' },
  { code: 'KP', dial: '+850',  flag: '🇰🇵', name: 'Corée du Nord' },
  { code: 'KR', dial: '+82',   flag: '🇰🇷', name: 'Corée du Sud' },
  { code: 'CR', dial: '+506',  flag: '🇨🇷', name: 'Costa Rica' },
  { code: 'CI', dial: '+225',  flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: 'HR', dial: '+385',  flag: '🇭🇷', name: 'Croatie' },
  { code: 'CU', dial: '+53',   flag: '🇨🇺', name: 'Cuba' },
  { code: 'DK', dial: '+45',   flag: '🇩🇰', name: 'Danemark' },
  { code: 'DJ', dial: '+253',  flag: '🇩🇯', name: 'Djibouti' },
  { code: 'DM', dial: '+1767', flag: '🇩🇲', name: 'Dominique' },
  { code: 'EG', dial: '+20',   flag: '🇪🇬', name: 'Égypte' },
  { code: 'AE', dial: '+971',  flag: '🇦🇪', name: 'Émirats arabes unis' },
  { code: 'EC', dial: '+593',  flag: '🇪🇨', name: 'Équateur' },
  { code: 'ER', dial: '+291',  flag: '🇪🇷', name: 'Érythrée' },
  { code: 'ES', dial: '+34',   flag: '🇪🇸', name: 'Espagne' },
  { code: 'EE', dial: '+372',  flag: '🇪🇪', name: 'Estonie' },
  { code: 'SZ', dial: '+268',  flag: '🇸🇿', name: 'Eswatini' },
  { code: 'US', dial: '+1',    flag: '🇺🇸', name: 'États-Unis' },
  { code: 'ET', dial: '+251',  flag: '🇪🇹', name: 'Éthiopie' },
  { code: 'FJ', dial: '+679',  flag: '🇫🇯', name: 'Fidji' },
  { code: 'FI', dial: '+358',  flag: '🇫🇮', name: 'Finlande' },
  { code: 'FR', dial: '+33',   flag: '🇫🇷', name: 'France' },
  { code: 'GA', dial: '+241',  flag: '🇬🇦', name: 'Gabon' },
  { code: 'GM', dial: '+220',  flag: '🇬🇲', name: 'Gambie' },
  { code: 'GE', dial: '+995',  flag: '🇬🇪', name: 'Géorgie' },
  { code: 'GH', dial: '+233',  flag: '🇬🇭', name: 'Ghana' },
  { code: 'GR', dial: '+30',   flag: '🇬🇷', name: 'Grèce' },
  { code: 'GD', dial: '+1473', flag: '🇬🇩', name: 'Grenade' },
  { code: 'GT', dial: '+502',  flag: '🇬🇹', name: 'Guatemala' },
  { code: 'GN', dial: '+224',  flag: '🇬🇳', name: 'Guinée' },
  { code: 'GW', dial: '+245',  flag: '🇬🇼', name: 'Guinée-Bissau' },
  { code: 'GQ', dial: '+240',  flag: '🇬🇶', name: 'Guinée équatoriale' },
  { code: 'GY', dial: '+592',  flag: '🇬🇾', name: 'Guyana' },
  { code: 'HT', dial: '+509',  flag: '🇭🇹', name: 'Haïti' },
  { code: 'HN', dial: '+504',  flag: '🇭🇳', name: 'Honduras' },
  { code: 'HU', dial: '+36',   flag: '🇭🇺', name: 'Hongrie' },
  { code: 'MH', dial: '+692',  flag: '🇲🇭', name: 'Îles Marshall' },
  { code: 'SB', dial: '+677',  flag: '🇸🇧', name: 'Îles Salomon' },
  { code: 'IN', dial: '+91',   flag: '🇮🇳', name: 'Inde' },
  { code: 'ID', dial: '+62',   flag: '🇮🇩', name: 'Indonésie' },
  { code: 'IQ', dial: '+964',  flag: '🇮🇶', name: 'Irak' },
  { code: 'IR', dial: '+98',   flag: '🇮🇷', name: 'Iran' },
  { code: 'IE', dial: '+353',  flag: '🇮🇪', name: 'Irlande' },
  { code: 'IS', dial: '+354',  flag: '🇮🇸', name: 'Islande' },
  { code: 'IL', dial: '+972',  flag: '🇮🇱', name: 'Israël' },
  { code: 'IT', dial: '+39',   flag: '🇮🇹', name: 'Italie' },
  { code: 'JM', dial: '+1876', flag: '🇯🇲', name: 'Jamaïque' },
  { code: 'JP', dial: '+81',   flag: '🇯🇵', name: 'Japon' },
  { code: 'JO', dial: '+962',  flag: '🇯🇴', name: 'Jordanie' },
  { code: 'KZ', dial: '+7',    flag: '🇰🇿', name: 'Kazakhstan' },
  { code: 'KE', dial: '+254',  flag: '🇰🇪', name: 'Kenya' },
  { code: 'KG', dial: '+996',  flag: '🇰🇬', name: 'Kirghizistan' },
  { code: 'KI', dial: '+686',  flag: '🇰🇮', name: 'Kiribati' },
  { code: 'KW', dial: '+965',  flag: '🇰🇼', name: 'Koweït' },
  { code: 'LA', dial: '+856',  flag: '🇱🇦', name: 'Laos' },
  { code: 'LS', dial: '+266',  flag: '🇱🇸', name: 'Lesotho' },
  { code: 'LV', dial: '+371',  flag: '🇱🇻', name: 'Lettonie' },
  { code: 'LB', dial: '+961',  flag: '🇱🇧', name: 'Liban' },
  { code: 'LR', dial: '+231',  flag: '🇱🇷', name: 'Liberia' },
  { code: 'LY', dial: '+218',  flag: '🇱🇾', name: 'Libye' },
  { code: 'LI', dial: '+423',  flag: '🇱🇮', name: 'Liechtenstein' },
  { code: 'LT', dial: '+370',  flag: '🇱🇹', name: 'Lituanie' },
  { code: 'LU', dial: '+352',  flag: '🇱🇺', name: 'Luxembourg' },
  { code: 'MK', dial: '+389',  flag: '🇲🇰', name: 'Macédoine du Nord' },
  { code: 'MG', dial: '+261',  flag: '🇲🇬', name: 'Madagascar' },
  { code: 'MY', dial: '+60',   flag: '🇲🇾', name: 'Malaisie' },
  { code: 'MW', dial: '+265',  flag: '🇲🇼', name: 'Malawi' },
  { code: 'MV', dial: '+960',  flag: '🇲🇻', name: 'Maldives' },
  { code: 'ML', dial: '+223',  flag: '🇲🇱', name: 'Mali' },
  { code: 'MT', dial: '+356',  flag: '🇲🇹', name: 'Malte' },
  { code: 'MA', dial: '+212',  flag: '🇲🇦', name: 'Maroc' },
  { code: 'MU', dial: '+230',  flag: '🇲🇺', name: 'Maurice' },
  { code: 'MR', dial: '+222',  flag: '🇲🇷', name: 'Mauritanie' },
  { code: 'MX', dial: '+52',   flag: '🇲🇽', name: 'Mexique' },
  { code: 'FM', dial: '+691',  flag: '🇫🇲', name: 'Micronésie' },
  { code: 'MD', dial: '+373',  flag: '🇲🇩', name: 'Moldavie' },
  { code: 'MC', dial: '+377',  flag: '🇲🇨', name: 'Monaco' },
  { code: 'MN', dial: '+976',  flag: '🇲🇳', name: 'Mongolie' },
  { code: 'ME', dial: '+382',  flag: '🇲🇪', name: 'Monténégro' },
  { code: 'MZ', dial: '+258',  flag: '🇲🇿', name: 'Mozambique' },
  { code: 'NA', dial: '+264',  flag: '🇳🇦', name: 'Namibie' },
  { code: 'NR', dial: '+674',  flag: '🇳🇷', name: 'Nauru' },
  { code: 'NP', dial: '+977',  flag: '🇳🇵', name: 'Népal' },
  { code: 'NI', dial: '+505',  flag: '🇳🇮', name: 'Nicaragua' },
  { code: 'NE', dial: '+227',  flag: '🇳🇪', name: 'Niger' },
  { code: 'NG', dial: '+234',  flag: '🇳🇬', name: 'Nigeria' },
  { code: 'NO', dial: '+47',   flag: '🇳🇴', name: 'Norvège' },
  { code: 'NZ', dial: '+64',   flag: '🇳🇿', name: 'Nouvelle-Zélande' },
  { code: 'OM', dial: '+968',  flag: '🇴🇲', name: 'Oman' },
  { code: 'UG', dial: '+256',  flag: '🇺🇬', name: 'Ouganda' },
  { code: 'UZ', dial: '+998',  flag: '🇺🇿', name: 'Ouzbékistan' },
  { code: 'PK', dial: '+92',   flag: '🇵🇰', name: 'Pakistan' },
  { code: 'PW', dial: '+680',  flag: '🇵🇼', name: 'Palaos' },
  { code: 'PS', dial: '+970',  flag: '🇵🇸', name: 'Palestine' },
  { code: 'PA', dial: '+507',  flag: '🇵🇦', name: 'Panama' },
  { code: 'PG', dial: '+675',  flag: '🇵🇬', name: 'Papouasie-Nouvelle-Guinée' },
  { code: 'PY', dial: '+595',  flag: '🇵🇾', name: 'Paraguay' },
  { code: 'NL', dial: '+31',   flag: '🇳🇱', name: 'Pays-Bas' },
  { code: 'PE', dial: '+51',   flag: '🇵🇪', name: 'Pérou' },
  { code: 'PH', dial: '+63',   flag: '🇵🇭', name: 'Philippines' },
  { code: 'PL', dial: '+48',   flag: '🇵🇱', name: 'Pologne' },
  { code: 'PT', dial: '+351',  flag: '🇵🇹', name: 'Portugal' },
  { code: 'QA', dial: '+974',  flag: '🇶🇦', name: 'Qatar' },
  { code: 'DO', dial: '+1809', flag: '🇩🇴', name: 'République dominicaine' },
  { code: 'CZ', dial: '+420',  flag: '🇨🇿', name: 'République tchèque' },
  { code: 'RO', dial: '+40',   flag: '🇷🇴', name: 'Roumanie' },
  { code: 'GB', dial: '+44',   flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: 'RU', dial: '+7',    flag: '🇷🇺', name: 'Russie' },
  { code: 'RW', dial: '+250',  flag: '🇷🇼', name: 'Rwanda' },
  { code: 'KN', dial: '+1869', flag: '🇰🇳', name: 'Saint-Christophe-et-Niévès' },
  { code: 'SM', dial: '+378',  flag: '🇸🇲', name: 'Saint-Marin' },
  { code: 'VC', dial: '+1784', flag: '🇻🇨', name: 'Saint-Vincent-et-les-Grenadines' },
  { code: 'LC', dial: '+1758', flag: '🇱🇨', name: 'Sainte-Lucie' },
  { code: 'SV', dial: '+503',  flag: '🇸🇻', name: 'Salvador' },
  { code: 'WS', dial: '+685',  flag: '🇼🇸', name: 'Samoa' },
  { code: 'ST', dial: '+239',  flag: '🇸🇹', name: 'São Tomé-et-Principe' },
  { code: 'SN', dial: '+221',  flag: '🇸🇳', name: 'Sénégal' },
  { code: 'RS', dial: '+381',  flag: '🇷🇸', name: 'Serbie' },
  { code: 'SC', dial: '+248',  flag: '🇸🇨', name: 'Seychelles' },
  { code: 'SL', dial: '+232',  flag: '🇸🇱', name: 'Sierra Leone' },
  { code: 'SG', dial: '+65',   flag: '🇸🇬', name: 'Singapour' },
  { code: 'SK', dial: '+421',  flag: '🇸🇰', name: 'Slovaquie' },
  { code: 'SI', dial: '+386',  flag: '🇸🇮', name: 'Slovénie' },
  { code: 'SO', dial: '+252',  flag: '🇸🇴', name: 'Somalie' },
  { code: 'SD', dial: '+249',  flag: '🇸🇩', name: 'Soudan' },
  { code: 'SS', dial: '+211',  flag: '🇸🇸', name: 'Soudan du Sud' },
  { code: 'LK', dial: '+94',   flag: '🇱🇰', name: 'Sri Lanka' },
  { code: 'SE', dial: '+46',   flag: '🇸🇪', name: 'Suède' },
  { code: 'CH', dial: '+41',   flag: '🇨🇭', name: 'Suisse' },
  { code: 'SR', dial: '+597',  flag: '🇸🇷', name: 'Suriname' },
  { code: 'SY', dial: '+963',  flag: '🇸🇾', name: 'Syrie' },
  { code: 'TJ', dial: '+992',  flag: '🇹🇯', name: 'Tadjikistan' },
  { code: 'TZ', dial: '+255',  flag: '🇹🇿', name: 'Tanzanie' },
  { code: 'TD', dial: '+235',  flag: '🇹🇩', name: 'Tchad' },
  { code: 'TH', dial: '+66',   flag: '🇹🇭', name: 'Thaïlande' },
  { code: 'TL', dial: '+670',  flag: '🇹🇱', name: 'Timor oriental' },
  { code: 'TG', dial: '+228',  flag: '🇹🇬', name: 'Togo' },
  { code: 'TO', dial: '+676',  flag: '🇹🇴', name: 'Tonga' },
  { code: 'TT', dial: '+1868', flag: '🇹🇹', name: 'Trinité-et-Tobago' },
  { code: 'TN', dial: '+216',  flag: '🇹🇳', name: 'Tunisie' },
  { code: 'TM', dial: '+993',  flag: '🇹🇲', name: 'Turkménistan' },
  { code: 'TR', dial: '+90',   flag: '🇹🇷', name: 'Turquie' },
  { code: 'TV', dial: '+688',  flag: '🇹🇻', name: 'Tuvalu' },
  { code: 'UA', dial: '+380',  flag: '🇺🇦', name: 'Ukraine' },
  { code: 'UY', dial: '+598',  flag: '🇺🇾', name: 'Uruguay' },
  { code: 'VU', dial: '+678',  flag: '🇻🇺', name: 'Vanuatu' },
  { code: 'VA', dial: '+379',  flag: '🇻🇦', name: 'Vatican' },
  { code: 'VE', dial: '+58',   flag: '🇻🇪', name: 'Venezuela' },
  { code: 'VN', dial: '+84',   flag: '🇻🇳', name: 'Vietnam' },
  { code: 'YE', dial: '+967',  flag: '🇾🇪', name: 'Yémen' },
  { code: 'ZM', dial: '+260',  flag: '🇿🇲', name: 'Zambie' },
  { code: 'ZW', dial: '+263',  flag: '🇿🇼', name: 'Zimbabwe' },
];

const FEATURES = [
  { icon: Film,      label: 'Films & séries en streaming HD',     color: '#7B3FF2' },
  { icon: Play,      label: 'Reels, stories & contenu viral',     color: '#A855F7' },
  { icon: Music2,    label: 'Concerts live & replays exclusifs',  color: '#EC4899' },
  { icon: Calendar,  label: 'Événements & billets numériques',    color: '#F59E0B' },
  { icon: Radio,     label: 'Communautés, wallet & monétisation', color: '#10B981' },
];

export default function LoginPage() {
  const navigate   = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();

  const redirectTo = getSafeRedirect(searchParams.get('redirect'));

  const [method,      setMethod]      = useState<LoginMethod>('email');
  const [identifier,  setIdentifier]  = useState('');
  const [country,     setCountry]     = useState(COUNTRIES[0]);
  const [showCountry, setShowCountry] = useState(false);
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [focused,     setFocused]     = useState<string | null>(null);
  const [gLoading,    setGLoading]    = useState(false);
  const [showQR,      setShowQR]      = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  // Fermer le dropdown pays en cliquant dehors
  useEffect(() => {
    if (!showCountry) return;
    const close = () => setShowCountry(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showCountry]);

  function switchMethod() {
    setMethod(m => m === 'email' ? 'phone' : 'email');
    setIdentifier('');
    clearError();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const phoneTrimmed = identifier.trim();
    // Si l'utilisateur a déjà tapé son indicatif (+xxx ou 00xxx), on le garde tel quel —
    // évite un double préfixe si le sélecteur pays n'a pas été changé (silencieusement sur un autre pays).
    const hasOwnDialCode = /^(\+|00)\d/.test(phoneTrimmed);
    const id = method === 'email'
      ? phoneTrimmed
      : hasOwnDialCode ? phoneTrimmed : `${country.dial}${phoneTrimmed}`;
    try {
      await login({ identifier: id, password });
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const detail = getApiErrorDetail(err) as any;
      if (detail && typeof detail === 'object' && detail.code === 'account_unverified') {
        navigate(`/auth/verify-registration?redirect=${encodeURIComponent(redirectTo)}`, {
          state: { userId: detail.user_id, identifier: id, password },
        });
      }
      /* sinon : erreur déjà affichée via le store */
    }
  }

  async function handleGoogle() {
    setGLoading(true);
    try {
      const googleToken = await googleOAuthPopup();
      const res = await apiClient.post<any>(Endpoints.auth.oauthGoogle, { provider: 'google', access_token: googleToken });
      const token = res.data;
      if (token?.access_token) {
        // Réutilise loginWithQR — même logique : setAuthToken + saveTokens + fetchMe
        await useAuthStore.getState().loginWithQR(token.access_token, token.refresh_token);
        if (token.profile_incomplete) {
          navigate(`/auth/complete-profile?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
        } else {
          navigate(redirectTo, { replace: true });
        }
      }
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (!msg.includes('closed') && !msg.includes('cancelled') && !msg.includes('cancel')) {
        import('react-hot-toast').then(({ default: toast }) =>
          toast.error(extractApiErrorMessage(e, msg || 'Connexion Google impossible'))
        );
      }
    } finally {
      setGLoading(false);
    }
  }

  const inpStyle = (name: string) => ({
    boxShadow:   focused === name ? '0 0 0 3px rgba(123,63,242,0.18)' : 'none',
    borderColor: focused === name ? 'var(--primary)' : 'var(--border)',
  });

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-10"
        style={{ background: 'linear-gradient(145deg,#0d0118 0%,#1a0533 40%,#2d0f5e 70%,#1a0533 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: 0.35 }} />
          <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: 0.25 }} />
          <div className="absolute inset-0 hero-grid opacity-20" />
        </div>
        <div className="relative z-10">
          <RoundLogo size={44} />
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white leading-tight mb-3">
              Tout l'univers<br />
              <span style={{ background: 'linear-gradient(90deg,#A78BFA,#F472B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                GoFolyX
              </span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              Films, séries, reels, concerts live, événements, communautés, portefeuille et monétisation — la plateforme tout-en-un pensée pour l'Afrique et sa diaspora.
            </p>
          </div>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <span className="text-white/75 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          <AppDownloadBar variant="card" />
          <p className="text-white/30 text-xs">© 2026 GoFolyX · Tous droits réservés</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="absolute inset-0 pointer-events-none overflow-hidden lg:hidden">
          <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: isDark ? 0.15 : 0.06 }} />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: isDark ? 0.12 : 0.05 }} />
        </div>

        <div className="relative w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <RoundLogo size={52} />
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Bon retour</h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Connectez-vous à votre compte GoFolyX</p>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-4 transition-all font-semibold text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {gLoading ? 'Connexion…' : 'Continuer avec Google'}
          </button>

          {/* QR toggle */}
          <button type="button" onClick={() => { setShowQR(v => !v); clearError(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mb-5 text-sm font-medium transition-all"
            style={{
              background: showQR ? 'rgba(123,63,242,0.10)' : 'var(--surface)',
              border: `1px solid ${showQR ? 'rgba(123,63,242,0.5)' : 'var(--border)'}`,
              color: showQR ? 'var(--primary)' : 'var(--text-secondary)',
            }}>
            <QrCode size={16} />
            {showQR ? 'Connexion par mot de passe' : 'Connexion par QR code'}
          </button>

          {showQR && (
            <div className="mb-5 flex flex-col items-center py-4 rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <QRLoginPanel />
            </div>
          )}

          {!showQR && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ou avec identifiant</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.3)', color: '#7B3FF2' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Champ identifiant */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {method === 'email' ? 'Email ou nom d\'utilisateur' : 'Numéro de téléphone'}
                    </label>
                    {/* Toggle pill */}
                    <button type="button" onClick={switchMethod}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                      style={{ background: 'rgba(123,63,242,0.12)', border: '1px solid rgba(123,63,242,0.35)', color: 'var(--primary)' }}>
                      {method === 'email'
                        ? <><Smartphone size={11} /> Téléphone</>
                        : <><Mail size={11} /> Email</>}
                    </button>
                  </div>

                  {method === 'email' ? (
                    <input
                      type="text"
                      placeholder="email@exemple.com ou @username"
                      value={identifier}
                      onChange={e => { setIdentifier(e.target.value); clearError(); }}
                      onFocus={() => setFocused('id')}
                      onBlur={() => setFocused(null)}
                      required
                      autoComplete="username"
                      className="input"
                      style={inpStyle('id')}
                    />
                  ) : (
                    <div className="flex gap-2">
                      {/* Sélecteur pays */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setShowCountry(v => !v); }}
                          className="flex items-center gap-1.5 h-full px-3 rounded-xl text-sm font-semibold transition-all"
                          style={{
                            background: 'var(--bg-secondary)',
                            border: `1px solid ${focused === 'phone' ? 'var(--primary)' : 'var(--border)'}`,
                            color: 'var(--text-primary)',
                            minWidth: 90,
                          }}>
                          <span className="text-base">{country.flag}</span>
                          <span>{country.dial}</span>
                          <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />
                        </button>

                        {showCountry && (
                          <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-xl"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: 220, maxHeight: 260, overflowY: 'auto' }}
                            onClick={e => e.stopPropagation()}>
                            {COUNTRIES.map(c => (
                              <button key={c.code} type="button"
                                onClick={() => { setCountry(c); setShowCountry(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-all"
                                style={{
                                  background: c.code === country.code ? 'rgba(123,63,242,0.1)' : 'transparent',
                                  color: c.code === country.code ? 'var(--primary)' : 'var(--text-primary)',
                                }}
                                onMouseEnter={e => { if (c.code !== country.code) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                                onMouseLeave={e => { if (c.code !== country.code) e.currentTarget.style.background = 'transparent'; }}>
                                <span className="text-base">{c.flag}</span>
                                <span className="flex-1 truncate">{c.name}</span>
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{c.dial}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Numéro */}
                      <input
                        type="tel"
                        placeholder="77 000 00 00"
                        value={identifier}
                        onChange={e => { setIdentifier(e.target.value.replace(/\D/g, '')); clearError(); }}
                        onFocus={() => setFocused('phone')}
                        onBlur={() => setFocused(null)}
                        required
                        autoComplete="tel"
                        className="input flex-1"
                        style={inpStyle('phone')}
                      />
                    </div>
                  )}
                </div>

                {/* Mot de passe */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Mot de passe</label>
                    <Link to="/auth/forgot-password" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearError(); }}
                      onFocus={() => setFocused('pwd')}
                      onBlur={() => setFocused(null)}
                      required
                      autoComplete="current-password"
                      className="input pr-11"
                      style={inpStyle('pwd')}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full gap-2 mt-1"
                  style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                  {isLoading ? (
                    <span className="inline-flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                          style={{ animation: `blink 1s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </span>
                  ) : <Sparkles size={16} />}
                  {isLoading ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            Pas encore de compte ?{' '}
            <Link to="/auth/register" className="font-semibold" style={{ color: 'var(--primary)' }}>
              S'inscrire gratuitement
            </Link>
          </p>

          <p className="text-center mt-5 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            En vous connectant, vous acceptez nos{' '}
            <Link to="/cgu" className="underline hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
              Conditions Générales d'Utilisation
            </Link>
            {' '}et notre{' '}
            <Link to="/politique-confidentialite" className="underline hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
              Politique de confidentialité
            </Link>
            .
          </p>

          {/* Télécharger l'app — visible mobile uniquement (lg:hidden car le panel gauche le montre déjà) */}
          <AppDownloadBar className="mt-6 lg:hidden" />

        </div>
      </div>
    </div>
  );
}
