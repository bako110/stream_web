import { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Smartphone, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

type QRState = 'loading' | 'ready' | 'scanned' | 'expired' | 'error';

interface StatusResponse {
  status: 'pending' | 'scanned' | 'expired';
  ttl_seconds?: number;
  access_token?: string;
  refresh_token?: string;
}

const POLL_INTERVAL_MS = 2000;
const QR_TTL_S = 120;

export default function QRLoginPanel() {
  const navigate = useNavigate();
  const { loginWithQR } = useAuthStore();

  const [qrToken, setQrToken]         = useState<string | null>(null);
  const [qrState, setQrState]         = useState<QRState>('loading');
  const [remaining, setRemaining]     = useState(QR_TTL_S);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stopTimers = () => {
    if (pollRef.current)  clearInterval(pollRef.current);
    if (countRef.current) clearInterval(countRef.current);
  };

  const generate = useCallback(async () => {
    stopTimers();
    setQrState('loading');
    setQrToken(null);
    setRemaining(QR_TTL_S);

    try {
      const res = await apiClient.post<{ token: string; ttl_seconds: number }>(
        Endpoints.auth.webQrGenerate,
      );
      if (!mountedRef.current) return;

      const { token, ttl_seconds } = res.data;
      setQrToken(token);
      setQrState('ready');
      setRemaining(ttl_seconds);

      // Décompte affiché
      countRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(countRef.current!); return 0; }
          return r - 1;
        });
      }, 1000);

      // Polling status
      pollRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        try {
          const s = await apiClient.get<StatusResponse>(Endpoints.auth.webQrStatus(token));
          const { status, access_token, refresh_token } = s.data;

          if (status === 'scanned' && access_token) {
            stopTimers();
            if (!mountedRef.current) return;
            setQrState('scanned');
            setIsLoggingIn(true);
            try {
              await loginWithQR(access_token, refresh_token);
              navigate('/feed', { replace: true });
            } catch {
              if (mountedRef.current) setQrState('error');
            } finally {
              if (mountedRef.current) setIsLoggingIn(false);
            }
          } else if (status === 'expired') {
            stopTimers();
            if (mountedRef.current) setQrState('expired');
          }
        } catch { /* ignore network hiccups */ }
      }, POLL_INTERVAL_MS);

    } catch {
      if (mountedRef.current) setQrState('error');
    }
  }, [loginWithQR, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    generate();
    return () => {
      mountedRef.current = false;
      stopTimers();
    };
  }, [generate]);

  const pct = (remaining / QR_TTL_S) * 100;
  const strokeColor = pct > 40 ? '#7B3FF2' : pct > 15 ? '#F59E0B' : '#F0365A';

  return (
    <div className="flex flex-col items-center gap-4 select-none">

      {/* QR frame + timer circulaire */}
      <div className="relative">
        {qrState === 'ready' && (
          <svg
            className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] pointer-events-none"
            style={{ transform: 'rotate(-90deg)' }}
            viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="var(--border)" strokeWidth="2" />
            <circle cx="50" cy="50" r="48" fill="none" stroke={strokeColor} strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 48}`}
              strokeDashoffset={`${2 * Math.PI * 48 * (1 - pct / 100)}`}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
          </svg>
        )}

        <div className="w-44 h-44 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'var(--surface)', border: '2px solid var(--border)' }}>

          {qrState === 'loading' && (
            <div className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          )}

          {qrState === 'ready' && qrToken && (
            <div className="p-2">
              <QRCodeSVG
                value={qrToken}
                size={152}
                bgColor="transparent"
                fgColor="var(--text-primary)"
                level="M"
              />
            </div>
          )}

          {(qrState === 'scanned' || isLoggingIn) && (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <CheckCircle size={36} style={{ color: '#22C55E' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Connexion en cours…
              </span>
            </div>
          )}

          {qrState === 'expired' && (
            <div className="flex flex-col items-center gap-3 px-4 text-center">
              <Clock size={32} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>QR expiré</span>
              <button onClick={generate}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.3)' }}>
                <RefreshCw size={12} /> Actualiser
              </button>
            </div>
          )}

          {qrState === 'error' && (
            <div className="flex flex-col items-center gap-3 px-4 text-center">
              <span className="text-xs" style={{ color: '#F0365A' }}>Erreur de génération</span>
              <button onClick={generate}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(240,54,90,0.1)', color: '#F0365A', border: '1px solid rgba(240,54,90,0.3)' }}>
                <RefreshCw size={12} /> Réessayer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timer texte */}
      {qrState === 'ready' && (
        <p className="text-xs tabular-nums" style={{ color: remaining <= 20 ? '#F0365A' : 'var(--text-tertiary)' }}>
          Expire dans {remaining}s
        </p>
      )}

      {/* Instructions */}
      {qrState === 'ready' && (
        <div className="flex flex-col gap-2 w-full max-w-[220px]">
          {[
            { n: 1, text: 'Ouvrez GoFolix sur votre mobile' },
            { n: 2, text: 'Allez dans Paramètres → Scanner' },
            { n: 3, text: 'Scannez le QR code' },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: 'rgba(123,63,242,0.15)', color: 'var(--primary)' }}>
                {n}
              </span>
              <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>
      )}

      {qrState === 'ready' && (
        <button onClick={generate}
          className="flex items-center gap-1.5 text-xs mt-1 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
          <RefreshCw size={12} /> Nouveau QR
        </button>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <Smartphone size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Connexion sécurisée depuis l'app mobile
        </span>
      </div>
    </div>
  );
}
