/**
 * Social auth config. Set VITE_FACEBOOK_APP_ID in `.env` / Codemagic env
 * after creating the Meta app (see FACEBOOK_SETUP.md).
 */
export const FACEBOOK_APP_ID = String(import.meta.env.VITE_FACEBOOK_APP_ID || "").trim();

export const NATIVE_FACEBOOK_AUTH_URL =
  "https://level-up-life-73702.web.app/native-facebook-auth.html";

export const NATIVE_FACEBOOK_AUTH_CALLBACK_PREFIX =
  "com.coenenmarket.leveluplife://facebook-auth";

export const CLAIM_NATIVE_FACEBOOK_SESSION = "claimNativeFacebookSession";

export function isFacebookConfigured(): boolean {
  return FACEBOOK_APP_ID.length > 0;
}
