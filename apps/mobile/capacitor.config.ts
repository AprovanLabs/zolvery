import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aprovan.zolvery',
  appName: 'Zolvery',
  webDir: '../client/dist',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#3059d4',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#3059d4',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  android: {
    backgroundColor: '#3059d4',
  },
};

export default config;
