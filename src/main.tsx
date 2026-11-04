import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initPressFeedback } from './utils/pressFeedback'
import { initNativeStatusBar } from './utils/nativeStatusBar'

initPressFeedback()
initNativeStatusBar()

// iPhone / iPad (Safari, WebView iOS) : le HLS est lu nativement par <video>.
// hls.js (MSE) y est instable et absent des anciens iPhone → on le désactive
// pour que tout le code retombe sur « video.src = manifest ».
// NE PAS étendre à Android : canPlayType() y répond « maybe » mais hls.js y
// reste plus fiable (qualité, reprise, autoplay) que le HLS natif du WebView.
try {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    import('hls.js').then(({ default: Hls }) => { Hls.isSupported = () => false; });
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
