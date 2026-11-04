import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initPressFeedback } from './utils/pressFeedback'

initPressFeedback()

// iPhone / Safari : le HLS est lu nativement par <video>. hls.js (MSE) y est
// instable (iOS 17.1+ annonce un support partiel qui échoue sur nos flux) et
// n'existe pas du tout sur les anciens iPhone. Si le navigateur lit déjà le
// HLS, on dit à hls.js de s'effacer : tout le code retombe alors sur la
// branche « lecture native » (video.src = manifest).
try {
  const probe = document.createElement('video');
  if (probe.canPlayType('application/vnd.apple.mpegurl')) {
    import('hls.js').then(({ default: Hls }) => { Hls.isSupported = () => false; });
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
