import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.milcalc.app',

  // App name shown on device home screen
  appName: 'MilCalc',

  // Where Vite outputs the build
  webDir: 'dist',

  server: {
    // Set to false for production builds
    androidScheme: 'https',
  },

  android: {
    // Build as release-ready by default
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'key0',
    }
  },

  ios: {
    // Matches your Apple Developer provisioning profile
    scheme: 'MilCalc',
    contentInset: 'automatic',
  },

  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1B3F7A',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F4F1EB',
      showSpinner: false,
    },
  },
};

export default config;
