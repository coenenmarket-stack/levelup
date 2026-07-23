# Level Up Life — iOS & App Store Guide

## Paths to iPhone

| Path | Status | App Store? |
|---|---|---|
| **PWA (Add to Home Screen)** | Ready | No |
| **Capacitor native app** | Ready — Codemagic builds | Yes |

**Bundle ID:** `com.coenenmarket.leveluplife`  
**Xcode project:** `ios/App/App.xcodeproj`  
**Scheme:** `App`

---

## Phase 1 — PWA (done)

See sections below for Safari testing. Skip if you're going straight to the App Store app.

---

## Phase 2 — Capacitor + Codemagic (current)

### What's configured

- Capacitor 8 with iOS platform (`ios/`)
- Plugins: App, Splash Screen, Status Bar, Browser
- Native shell init in `client/src/main.tsx`
- Google Sign-In uses redirect on iOS + native app
- iOS icons/splash generated via `npm run cap:assets`
- `codemagic.yaml` — TestFlight + simulator smoke workflows
- Portrait-only orientation, photo library permission (avatar upload)

### Local commands (Windows)

```powershell
cd C:\Users\Coene\projects\levelup

# After web changes:
npm run cap:sync          # build + cap sync ios

# Regenerate native icons/splash:
npm run cap:assets

# Open in Xcode (requires Mac):
npm run cap:open
```

---

## Codemagic setup (one-time)

### 1. Connect repository

1. [codemagic.io](https://codemagic.io) → Add application → your Git remote
2. Codemagic detects `codemagic.yaml` automatically

### 2. App Store Connect API key

1. [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → Integrations → **App Store Connect API**
2. Create key with **App Manager** role
3. Download `.p8` file (once)
4. Codemagic → Team settings → **Integrations** → **App Store Connect**
5. Add integration (name it `codemagic` to match `codemagic.yaml`, or update the yaml)

### 3. Code signing

Codemagic **automatic signing** (recommended):

1. Codemagic → your app → **Distribution** → iOS code signing
2. Enable **Automatic** with your App Store Connect integration
3. Bundle ID: `com.coenenmarket.leveluplife`

The workflow runs `app-store-connect fetch-signing-files` to create/fetch certificates.

### 4. Create app in App Store Connect

1. App Store Connect → **Apps** → **+** → New App
2. Platform: iOS
3. Name: **Level Up Life**
4. Bundle ID: `com.coenenmarket.leveluplife` (register in Apple Developer → Identifiers first if needed)
5. SKU: `levelup-life` (any unique string)

### 5. Trigger a build

Push to `main` or `release/*`, or start manually in Codemagic.

Workflow **`ios-testflight`** will:

1. `npm ci` → `npm run build` → `npx cap sync ios`
2. Sign with App Store cert
3. Build `.ipa`
4. Upload to **TestFlight**

Workflow **`ios-simulator`** is a cheaper compile-only smoke test (no signing).

### 6. Optional: build notifications

In Codemagic → your app → **Notifications**, add your email for success/failure alerts (or add a `publishing.email` block in `codemagic.yaml`).

---

## Firebase Auth on native iOS

The app uses the **web Firebase SDK** inside Capacitor's WKWebView.

### Authorized domains (Firebase Console)

Add if missing:

- `level-up-life-73702.web.app`
- `level-up-life-73702.firebaseapp.com`
- `localhost` (Capacitor uses `https://localhost` as the WKWebView origin)

### Google OAuth (Google Cloud Console)

Authorized redirect URI must include:

- `https://level-up-life-73702.web.app/__/auth/handler`

### Test Google Sign-In on TestFlight

If redirect fails in the native WebView, next step is `@capacitor-firebase/authentication` (native Google Sign-In). Test on a real device first.

---

## App Store submission checklist

- [ ] Privacy policy URL (required) — host at `/privacy` or external page
- [ ] App Store screenshots (6.7" + 6.5" iPhone)
- [ ] Description, keywords, support URL
- [ ] App privacy questionnaire (email, user ID, usage data via Firebase)
- [ ] Review notes: *"Sign in with Google or email/password. Demo account available on request."*
- [ ] Age rating questionnaire
- [ ] 1024×1024 icon in App Store Connect (use `assets/icon.png`)

### Version bumps

Marketing version: edit `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj` (currently `1.0`).  
Build number: Codemagic sets automatically via `agvtool` using `$BUILD_NUMBER`.

---

## Regenerate icons

```powershell
# Update client/public/icon-source.png or assets/icon.png, then:
npm run icons          # PWA web icons
npm run cap:assets     # Native iOS asset catalog
npm run cap:sync
```

---

## Files reference

| File | Purpose |
|---|---|
| `capacitor.config.ts` | Capacitor app config |
| `codemagic.yaml` | CI/CD workflows |
| `ios/` | Native Xcode project (commit to git) |
| `assets/icon.png` | Source for native icon generation |
| `client/src/lib/ios.ts` | Platform detection |
| `client/src/main.tsx` | Native splash/status bar init |

---

## Phase 3 — Native enhancements (later)

| Feature | Package |
|---|---|
| Push notifications | `@capacitor/push-notifications` + FCM |
| Native Google/Apple auth | `@capacitor-firebase/authentication` |
| Haptics on quest complete | `@capacitor/haptics` |
