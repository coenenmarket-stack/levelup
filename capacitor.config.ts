import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.coenenmarket.leveluplife",
  appName: "Level Up Life",
  webDir: "dist/public",
  // https://localhost is an authorized Firebase Auth domain and avoids the
  // capacitor:// origin that can stall the web Auth SDK inside WKWebView.
  server: {
    iosScheme: "https",
    androidScheme: "https",
    hostname: "localhost",
  },
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#0d1117",
      androidSplashResourceName: "splash",
      showSpinner: false,
      launchFadeOutDuration: 200,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d1117",
    },
  },
};

export default config;
