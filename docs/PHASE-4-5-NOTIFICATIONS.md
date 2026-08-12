# Phase 4.5 — Push + Email Notifications

## Audit summary (pre-implementation)

| Area | Status before 4.5 |
|------|-------------------|
| Local retention reminders | Capacitor Local Notifications (IDs 1001–1003) |
| Social prefs | Stored; **no delivery** |
| FCM / APNs | Not configured |
| Email | Firebase Auth only (verify/reset) |
| Device tokens | None |

## Architecture now

**Local (unchanged responsibility):** daily quest + streak risk reminders via `@capacitor/local-notifications`. Weekly local reminder may still schedule via retention path.

**Remote push:** `@capacitor/push-notifications` → FCM → APNs. Tokens at `characters/{uid}/devices/{deviceId}` (owner-only). Server sends through `functions/src/notifications/service.ts` (`sendPushToUser` / prefs / quiet hours / rate limits / invalid token cleanup). Inbox records at `characters/{uid}/notifications` (CF create; client mark-read).

**Remote master:** `users/{uid}.pushEnabled` must be `true` for social/growth remote pushes. `notificationsEnabled` alone controls **local** retention only.

**Email:** Resend HTTP API via secret `RESEND_API_KEY`. Weekly job `weeklyProgressEmailJob` (hourly schedule; sends Sunday 18:00–18:59 local). Opt-in only; verified email required. Batches of 200 with rotating cursor (`system/weeklyEmailCursor`).

**Registration UX:**
- No permission prompt on cold launch
- Contextual `PushOptInCard` on Home + Settings enable path
- Silent token refresh on resume/login when already granted
- Denied state persisted; opt-in card respects deny + 14-day dismiss

**Not yet auto-fired (prefs reserved):** achievement / goal / career milestone pushes; goal-reminder and social-digest email jobs.

---

## Manual iOS / Xcode steps (Cursor cannot complete)

1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select target **App** → **Signing & Capabilities**.
3. Add **Push Notifications** capability.
4. Add **Background Modes** → enable **Remote notifications** (recommended).
5. Confirm `App.entitlements` gains `aps-environment` (`development` / `production` per profile).
6. Do **not** change bundle id (`com.coenenmarket.leveluplife`) or signing team unless intentional.

## Manual Firebase / APNs steps

1. Firebase Console → Project settings → add/select **iOS app** with bundle id `com.coenenmarket.leveluplife`.
2. Download **GoogleService-Info.plist** into `ios/App/App/` (currently **not** committed — do not invent one; keep out of git if team policy prefers secrets via CI).
3. Cloud Messaging → **Apple app configuration** → upload **APNs Authentication Key** (.p8) from Apple Developer → Keys.
4. Enable Cloud Messaging API if prompted.
5. Expected Firebase project: **`level-up-life-73702`** (see `.firebaserc`).

## Secrets / email provider

```bash
# After firebase login / use level-up-life-73702
npx firebase functions:secrets:set RESEND_API_KEY
```

Create a Resend account, verify sending domain (or use onboarding domain for QA), set from-address in `functions/src/notifications/email.ts` if needed.

## Deploy later (do not run without credentials)

```bash
npx firebase login
npx firebase use level-up-life-73702
npx firebase deploy --only firestore:rules,firestore:indexes
npx firebase deploy --only \
  functions:weeklyProgressEmailJob,\
  functions:redeemReferralCode,functions:activateReferral,\
  functions:inviteSharedChallenge,functions:respondSharedChallenge,\
  functions:inviteToParty,functions:respondPartyInvite,\
  functions:refreshSharedChallengeProgress,functions:refreshPartyChallengeProgress,\
  functions:requestFriendByUid,functions:respondToFriendRequest,functions:redeemInviteCode
npx cap sync ios
```

Redeploy any social callable that imports the notification helper after code changes.

## Badge count

APNs payload sets `badge: 1` on send. Full unread badge sync would need `@capacitor/badge` or AppDelegate hooks — **intentionally skipped**. Inbox unread is shown in-app only. Do not treat badge as synchronized unread count.

## AI Coach

Coach must **not** send pushes/emails autonomously. Only structured app notify helpers may send; AI may suggest “Want a reminder?” in chat only.

## Scaling note (weekly email)

`WEEKLY_EMAIL_BATCH_SIZE = 200` users per hourly run with cursor rotation. At Sunday 18:00 local, multiple hourly ticks within the hour can drain larger queues. Beyond ~200 × hours-in-window, expand batch size or shard by timezone.
