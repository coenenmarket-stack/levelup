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

/**
 * In-app WebView Google OAuth is blocked (disallowed_useragent).
 * - Native Capacitor: open system Safari via Browser plugin, then deep-link back.
 * - Mobile Safari / PWA: Firebase redirect flow.
 */
export function shouldUseGoogleRedirect(): boolean {
  return !isNativeApp() && isIOS();
}

export function shouldUseNativeGoogleBrowser(): boolean {
  return isNativeApp();
}

export const NATIVE_GOOGLE_AUTH_URL =
  "https://level-up-life-73702.web.app/native-google-auth.html";

export const NATIVE_GOOGLE_AUTH_CALLBACK_PREFIX =
  "com.coenenmarket.leveluplife://google-auth";
