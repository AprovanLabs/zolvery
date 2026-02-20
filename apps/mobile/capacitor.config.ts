import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aprovan.kossabos',
  appName: 'Kossabos',
  webDir: '../client/dist',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#E1477E',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#E1477E',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  android: {
    backgroundColor: '#E1477E',
  },
};

export default config;
