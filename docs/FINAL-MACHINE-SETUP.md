# Level Up Life — Final Machine + Codemagic Setup

Codemagic is the **primary** iOS build and TestFlight upload path. Do **not** archive/upload through Xcode for release.

Firebase project: **`level-up-life-73702`**  
Bundle ID: **`com.coenenmarket.leveluplife`**  
Release branch for TestFlight: **`cursor/app-store-launch-assets`**  
Consolidation work branch (do not merge until QA): **`cursor/release-consolidation-4ef7`**

---

## Intended release flow

```
cursor/app-store-launch-assets
  → Codemagic workflow ios-testflight-launch
  → signed IPA
  → App Store Connect upload
  → TestFlight (internal)
  → real-device QA (docs/RELEASE-QA-CHECKLIST.md)
  → release approval
  → merge/release to main when appropriate
```

---

## Ordered checklist (when you are at your authenticated machine)

### A. Firebase CLI (manual — prefer this over Codemagic deploys for now)

Safer/simpler for this project: **deploy from your machine** after `firebase login`. Do not put long-lived deploy tokens in CI until needed.

1. `npx firebase login`
2. `npx firebase use level-up-life-73702`
3. Confirm Blaze if Functions require it.
4. Deploy rules + indexes:
   ```bash
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```
5. Deploy AI Coach (needs `GEMINI_API_KEY` secret already set):
   ```bash
   npx firebase deploy --only functions:aiCoach
   ```
6. Set Resend secret (do not print the value):
   ```bash
   npx firebase functions:secrets:set RESEND_API_KEY
   ```
7. Deploy notification / social / weekly email functions (targeted), e.g.:
   ```bash
   npx firebase deploy --only \
     functions:weeklyProgressEmailJob,\
     functions:redeemReferralCode,functions:activateReferral,\
     functions:inviteSharedChallenge,functions:respondSharedChallenge,\
     functions:inviteToParty,functions:respondPartyInvite,\
     functions:refreshSharedChallengeProgress,functions:refreshPartyChallengeProgress,\
     functions:requestFriendByUid,functions:respondToFriendRequest,functions:redeemInviteCode,\
     functions:ensureInviteCode,functions:postProgressActivity,functions:shareGoalToFriends,\
     functions:cheerActivity,functions:removeFriend,functions:blockUser,functions:unblockUser,\
     functions:createParty,functions:leaveParty,functions:kickPartyMember,functions:renameParty,\
     functions:startPartyChallenge
   ```
   Adjust the list to match currently exported names in `functions/src/index.ts`.
8. Verify in Firebase Console → Functions that deploy succeeded.

### B. Apple Developer / APNs

1. Create or obtain **APNs Auth Key** (`.p8`) in Apple Developer → Keys.
2. Record **Key ID** and confirm **Team ID**.
3. Confirm App ID `com.coenenmarket.leveluplife` has **Push Notifications**.
4. In Xcode **or** Apple portal capability sync for the App: add Push Notifications; enable Background Modes → Remote notifications if required.
5. Confirm `ios/App/App/App.entitlements` gains `aps-environment` after signing/capability (currently entitlements only list Sign in with Apple — Push not verified in repo).
6. Do **not** change bundle ID casually.

### C. Firebase iOS + GoogleService-Info.plist

1. Firebase Console → Project settings → iOS app for `com.coenenmarket.leveluplife`.
2. Download the real **GoogleService-Info.plist** (do not fabricate).
3. **Preferred for Codemagic:** store as a Codemagic secure file / base64 env var and decode into:
   **`ios/App/App/GoogleService-Info.plist`**
   before `npx cap sync ios` / Xcode archive.
4. Repo currently has **no** committed plist — keep it that way unless team policy explicitly allows committing non-secret Firebase iOS config.
5. Cloud Messaging → upload APNs `.p8` (Key ID + Team ID).

### D. Codemagic (from existing `codemagic.yaml`)

Workflow to use: **`ios-testflight-launch`**  
Display name: *Level Up Life – iOS TestFlight (NEW ICON + Google auth / app-store-launch)*

Do **not** use `ios-testflight-main` for launch icon/Google auth.

1. Open Level Up Life app in Codemagic.
2. Confirm repository + branch trigger: `cursor/app-store-launch-assets`.
3. Confirm App Store Connect integration name: `codemagic` (as in YAML).
4. Confirm environment group: `levelup-signing`.
5. Confirm automatic signing via `app-store-connect fetch-signing-files` + `CERTIFICATE_PRIVATE_KEY`.
6. Confirm `BUNDLE_ID=com.coenenmarket.leveluplife`.
7. Add secure env / files:
   - `CERTIFICATE_PRIVATE_KEY` (required by YAML)
   - GoogleService-Info.plist secure file → write to `ios/App/App/GoogleService-Info.plist` (add a script step if not already in UI)
   - Optional later: Firebase token / Resend only if CI deploy is adopted (not recommended yet)
8. Pipeline already runs: `npm ci` → `npm run check` → `npm run build` → `npx cap sync ios` → icons → `agvtool` version **1.0.1** + `BUILD_NUMBER` → signed IPA → ASC upload.
9. Publishing: upload only; internal TestFlight (see YAML comments — no external beta auto-submit).
10. Verify build in App Store Connect → install on physical iPhone → run `docs/RELEASE-QA-CHECKLIST.md`.

### E. After infra is verified — flip feature flags

In `client/src/lib/featureFlags.ts`, enable only what you verified:

| Flag | Enable when |
|------|-------------|
| `remotePushEnabled` | APNs + FCM + entitlement + token registration works |
| `emailNotificationsEnabled` | Resend secret + weekly job verified |
| `friendsEnabled` | Social friend callables deployed |
| `socialChallengesEnabled` / `partiesEnabled` | Shared challenge / party CFs verified |
| `leaderboardsEnabled` | Opt-in ranks verified |
| `notificationInboxEnabled` | Inbox writes from CF verified |
| `socialHomeCardEnabled` | Friends surface ready |
| `aiCoachEnabled` | Keep true; ensure `aiCoach` deployed for non-fallback replies |

Ship a new Codemagic build after flag flips.

---

## Codemagic pre-flight (before every TestFlight build)

- [ ] Branch = `cursor/app-store-launch-assets`
- [ ] Workflow = `ios-testflight-launch` (not `ios-testflight-main`)
- [ ] Bundle ID = `com.coenenmarket.leveluplife`
- [ ] Marketing version + build number correct
- [ ] Firebase project = `level-up-life-73702`
- [ ] GoogleService-Info.plist present in build (secure inject)
- [ ] Apple signing / profiles OK (`levelup-signing`)
- [ ] Push entitlement / APNs / FCM configured (for remote push builds)
- [ ] Required env vars present (`CERTIFICATE_PRIVATE_KEY`, ASC integration)
- [ ] No test/debug config; production Firebase config
- [ ] Unit tests / check / web build green on the commit

---

## Environment variable names (placeholders only — never commit values)

| Name | Where | Purpose |
|------|-------|---------|
| `CERTIFICATE_PRIVATE_KEY` | Codemagic `levelup-signing` | Fetch/create signing certs |
| App Store Connect integration `codemagic` | Codemagic UI | ASC API auth (issuer/key managed in UI) |
| `BUILD_NUMBER` | Codemagic built-in | CFBundleVersion |
| `BUNDLE_ID` | `codemagic.yaml` | `com.coenenmarket.leveluplife` |
| `RESEND_API_KEY` | Firebase Functions secret | Weekly email |
| `GEMINI_API_KEY` | Firebase Functions secret | `aiCoach` / legacy `generateQuests` |
| GoogleService-Info.plist | Codemagic secure file | FCM/Firebase iOS |
| (optional later) Firebase CI token / SA JSON | Codemagic | Only if automating `firebase deploy` |

Apple Key ID / Team ID / Issuer ID live in Apple + Codemagic/Firebase consoles — do not invent values in git.

---

## GoogleService-Info.plist strategy

| Option | Recommendation |
|--------|----------------|
| Commit to repo | Only if team policy allows non-secret iOS Firebase config |
| Codemagic secure file → `ios/App/App/GoogleService-Info.plist` | **Preferred** |
| Base64 env decoded in script | Acceptable alternative |

Expected destination: **`ios/App/App/GoogleService-Info.plist`**.

---

## Firebase deploy strategy recommendation

**Choose A — manual from authenticated machine** for this release.

Reasons: fewer secrets in CI, targeted deploys, matches current “no credential deploy from agent” posture. Codemagic CI deploy (B) can wait until TestFlight pipeline is stable.

Required deploy scope for full Phase 4.5+:

- `aiCoach` (+ Gemini secret)
- Social + notification-related functions
- `weeklyProgressEmailJob` (+ Resend secret)
- Firestore rules
- Firestore indexes

---

## App Store Connect — verify manually

Cannot invent Connect metadata from the agent environment. Verify in ASC:

- App name, subtitle, privacy policy URL, support URL
- Version / what’s new
- Screenshots
- Privacy nutrition labels (including notifications if used)
- Push usage description / notification purpose strings if prompted
- No tip jar / donation IAP references
- Icons / splash from repo `assets/icon.png` + Codemagic icon pipeline

Repo assets present: `assets/icon.png`, `assets/splash.png`, Capacitor iOS project under `ios/App`.

---

## Compatibility code to keep through this release

Do **not** remove yet:

- Legacy UTC completion day-key handling
- Daily pack assignment / cache compatibility
- Cert localStorage → Firestore migration paths
- Legacy skill aliases
- Legacy notification preference defaults
- Owner-only device token docs

Classify cleanup as **post-release** unless a path is proven unused and safe.

---

## Dead code / cleanup classes

| Item | Class |
|------|-------|
| CF `generateQuests` (Gemini pack) | **post-release** — unused by client daily pack; do not delete CF blindly |
| Orphan `/shop` rewards route (not in menu) | **HIDE/DEFER** nav; keep code unless product drops rewards |
| Stale `DEPLOY.md` Spark/Coming Soon Coach copy | **safe now** (doc fix) |
| Invite hidden dev activate button | **safe now** (removed in consolidation) |
| Tip jar | Not present in current UI — confirm stays gone |

---

## Pending release actions (intentionally deferred)

- APNs key upload to Firebase
- Firebase authenticated production deploy
- Resend secret creation (until email flag on)
- Apple Developer portal capability confirmation on device provisioning
- App Store Connect metadata finalization
- Codemagic production/TestFlight run from your account
- Flipping `LAUNCH_FLAGS` for social/push/email
