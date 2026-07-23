import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import App from "./App";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0d1117" });
  } catch {
    // Status bar plugin unavailable in web preview
  }
  // Always dismiss splash once JS is alive so a hung Auth boot cannot look like a frozen launch.
  try {
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    // noop
  }
}

void initNativeShell();

createRoot(document.getElementById("root")!).render(<App />);
