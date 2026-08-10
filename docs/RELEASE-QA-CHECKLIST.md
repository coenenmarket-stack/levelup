# Level Up Life — Release QA Checklist

Use this on a **physical iPhone via TestFlight** after Codemagic publishes a build from `cursor/app-store-launch-assets` (or a green merge candidate). Mark each row Pass / Fail / Blocked.

**Blocked-by legend**

| Tag | Meaning |
|-----|---------|
| `APNs` | Needs Apple Push key + FCM APNs config + Push entitlement |
| `FIREBASE_DEPLOY` | Needs authenticated Firebase deploys (rules/indexes/functions) |
| `RESEND` | Needs `RESEND_API_KEY` secret + verified sender |
| `TF` | Needs Codemagic → TestFlight IPA on device |
| `FLAG` | Feature hidden by `LAUNCH_FLAGS` until infra verified |

Current launch flags (see `client/src/lib/featureFlags.ts`): social, remote push, email UI, inbox **OFF**; AI Coach **ON** (soft-fails if CF undeployed).

---

## Pre-flight (every TestFlight build)

- [ ] Correct branch built: `cursor/app-store-launch-assets`
- [ ] Bundle ID: `com.coenenmarket.leveluplife`
- [ ] Marketing version matches Codemagic (`1.0.1` in `codemagic.yaml` today)
- [ ] Build number incremented
- [ ] Firebase project: `level-up-life-73702`
- [ ] No debug/test-only UI visible in menu
- [ ] `npm run test:unit`, `npm run check`, production build, `npx cap sync ios`, functions build green on the commit

---

## Authentication

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Sign in email | Create/sign in with password | Lands in app / onboarding | `TF` |
| Sign in Google | Native Google path | Session restores | `TF` |
| Sign out | Settings → Sign out | Returns to auth | `TF` |
| Session restore | Kill app, reopen | Still signed in | `TF` |
| Existing user | Sign in account with progress | Character + quests restore | `TF` |

---

## Personalization

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Soft prompt | New/partial prefs | Prompt appears without blocking quests | `TF` |
| Onboarding | Complete onboarding | Character created; Home usable | `TF` |
| Edit prefs | Settings → Personalize Plan | Prefs persist after relaunch | `TF` |

---

## Quests

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Daily pack | Open Quests / Home | Pack assigned for local day | `TF` |
| Catalog add | Add from catalog | Appears in active list | `TF` |
| Completion | Complete a quest | XP/level update; no crash | `TF` |
| Persistence | Relaunch | Completion still recorded | `TF` |
| Duplicate XP | Complete same quest again | No double XP / idempotent | `TF` + ideally `FIREBASE_DEPLOY` for CF path |

---

## Streaks / Weekly / Achievements

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Streak increment | Complete on consecutive local days | Streak +1 | `TF` |
| Weekly challenge | Progress weekly UI | Progress persists | `TF` |
| Achievements | Unlock a badge | Shows in Achievements | `TF` |

---

## Career / Certs / Hustles / Goals

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Career paths | Browse + set active path | Path progress visible | `TF` |
| Certifications | Track a cert | Progress saves | `TF` |
| Side hustles | Open a hustle plan | Content loads; no income guarantees claimed | `TF` |
| Goals | Create + complete step | Empty/full states intentional | `TF` |

---

## AI Coach

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Open Coach | Bottom nav → Coach | Welcome + starters | `TF` |
| Ask question | Send a message | Reply **or** graceful fallback (no blank/crash) | `TF` / soft-fail until `FIREBASE_DEPLOY` (`aiCoach` + `GEMINI_API_KEY`) |
| Memory | Second message | Remembers focus without exposing private fields to others | `TF` |

---

## Social (currently HIDDEN via flags)

Flip flags only after CF deploy + device QA.

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Friends | Open /friends | List / empty state; no email exposure | `FLAG` + `FIREBASE_DEPLOY` + `TF` |
| Invite / referral | Redeem code; first quest activates | Milestone XP once | `FLAG` + `FIREBASE_DEPLOY` + `TF` |
| Shared challenges | Invite + accept | Progress updates | `FLAG` + `FIREBASE_DEPLOY` + `TF` |
| Parties | Create / invite / leave | Member list correct | `FLAG` + `FIREBASE_DEPLOY` + `TF` |
| Leaderboards | Opt in; view friends week | Opt-out by default; ranks only opted-in | `FLAG` + `FIREBASE_DEPLOY` + `TF` |

Direct deep links to gated routes should show **Feature unavailable**, not a crash.

---

## Notifications

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Local reminders | Settings → Enable reminders | Permission prompt once; daily/streak/weekly schedule | `TF` |
| Remote push opt-in | Home PushOptInCard | Hidden while `remotePushEnabled=false` | `FLAG` + `APNs` + `FIREBASE_DEPLOY` |
| Receive social push | Trigger friend invite push | Delivers outside quiet hours | `FLAG` + `APNs` + `FIREBASE_DEPLOY` |
| Email weekly | Opt in + wait Sunday window | Email arrives | `FLAG` + `RESEND` + `FIREBASE_DEPLOY` |
| Inbox | Open /notifications | Hidden until `notificationInboxEnabled` | `FLAG` + `FIREBASE_DEPLOY` |
| Deep links | Tap notification with allowlisted path | Opens allowed route only | `APNs` / local payload |

---

## Privacy / Settings / Support

| Test | Steps | Expected | Blocked by |
|------|-------|----------|------------|
| Privacy toggles | When social flags on | Life goal / level / streak visibility honored | `FLAG` + `TF` |
| Settings sections | Open Settings | Account / Personalization / Notifications·Progress / App / Security | `TF` |
| Help & Support | Open Support | Links work; no tip jar | `TF` |
| Account switch | Sign out + different account | No data bleed | `TF` |

---

## App Store readiness smoke

- [ ] No donation / tip jar CTA
- [ ] No “Coming Soon” on primary RELEASE surfaces
- [ ] No blank white screens on RELEASE routes
- [ ] No hardcoded secrets in client bundle (spot-check)
- [ ] No unbounded public feed / DMs
- [ ] Career/hustle copy does not guarantee income

---

## Shop / deferred surfaces

| Test | Expected | Blocked by |
|------|----------|------------|
| Direct `/shop` | FeatureUnavailable while `rewardsShopEnabled=false` | — |
| Stale social deep link | Resolves to Home (flags off) | — |
| Direct `/friends` etc. | FeatureUnavailable | — |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Device QA | | | Pass / Fail |
| Release owner | | | Approve TestFlight / hold |

**Do not** claim App Store approval from this checklist alone.
