module.exports = {
  appId: 'com.cookplan.app',
  appName: 'CookPlan',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    initialFocus: true,
    backgroundColor: '#27272a',
    overrideUserAgent: 'CookPlan/1.0',
    appendUserAgent: 'Capacitor',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#27272a',
      showSpinner: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#27272a',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};