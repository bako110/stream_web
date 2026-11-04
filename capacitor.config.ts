import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gofolyx.web',
  appName: 'GoFolyX',
  webDir: 'dist',
  backgroundColor: '#FFFFFF',
  android: {
    // Android 15+ force le plein écran : on laisse Capacitor injecter les marges
    // système (barre d'état / navigation) pour que header et footer ne soient pas collés.
    adjustMarginsForEdgeToEdge: 'auto',
  },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#FFFFFF' },
    StatusBar: { style: 'LIGHT', backgroundColor: '#FFFFFF', overlaysWebView: false },
  },
};

export default config;
