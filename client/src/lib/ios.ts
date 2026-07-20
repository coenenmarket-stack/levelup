/** iOS / Capacitor / mobile Safari detection helpers. */

import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  if (Capacitor.getPlatform() === "ios") return true;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return true;
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isNativeApp()) return false;
  const ua = navigator.userAgent;
  const isAppleDevice = isIOS();
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isAppleDevice && isSafari && !isStandalonePwa();
}

/** Google sign-in popups fail on iOS Safari and in Capacitor WKWebView — use redirect. */
export function shouldUseGoogleRedirect(): boolean {
  return isIOS() || isNativeApp();
}
