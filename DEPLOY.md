# Level Up Life — Firebase Deploy Instructions (Spark / Free Plan)

Project: **level-up-life-73702** → will be live at **https://level-up-life-73702.web.app**

This build runs entirely on Firebase's free **Spark** plan:
- **Hosting** — serves the static client
- **Auth** — Email/Password + Google sign-in
- **Firestore** — user data and game progress

No Cloud Functions, no billing required. The AI Coach page shows a "Coming Soon" placeholder for now — we'll wire it up later when you're ready to enable Blaze.

---

## 1. Pre-flight in the Firebase Console

In [console.firebase.google.com](https://console.firebase.google.com/project/level-up-life-73702):

- **Authentication → Sign-in method**
  - Enable **Email/Password**
  - Enable **Google** (set a project support email)
- **Firestore Database → Create database**
  - Mode: **Production**
  - Location: **nam5 (United States)** (or pick the closest region)

That's it — no Functions, no Blaze upgrade needed.

---

## 2. One-time CLI setup

```powershell
npm install -g firebase-tools
firebase login                # opens browser, sign in with your Google account
cd $HOME\projects\levelup
firebase use level-up-life-73702
```

---

## 3. Install + build

```powershell
npm install
npm run build                 # builds the static client into dist/public
```

---

## 4. Deploy

```powershell
firebase deploy --only hosting,firestore
```

When it finishes you'll see:

```
Hosting URL: https://level-up-life-73702.web.app
```

Share that link with testers.

---

## 5. Verify

1. Open the URL in an incognito window.
2. Click **Continue with Google** — should land on onboarding.
3. Pick a class and finish onboarding → land on the dashboard.
4. Open a second incognito window, sign up with email/password → independent account, no data bleed.

If Google sign-in pops a `unauthorized-domain` error, go to **Authentication → Settings → Authorized domains** and confirm `level-up-life-73702.web.app` is listed (it should be by default).

---

## What's where

| Concern        | Lives in                                                  |
| -------------- | --------------------------------------------------------- |
| Auth           | Firebase Auth (`client/src/lib/auth.tsx`)                 |
| User data      | Firestore `users/{uid}`, `characters/{uid}` + subcollections |
| Game logic     | Browser (`client/src/lib/gameLogic.ts`)                   |
| Security rules | `firestore.rules`                                         |
| Frontend       | Firebase Hosting, built from `dist/public`                |
| AI Coach       | Placeholder UI — deferred until Blaze plan is enabled     |

## Iteration loop after deploy

```powershell
# edit code…
npm run build
firebase deploy --only hosting           # static client only — fast
# rules changes:
firebase deploy --only firestore:rules
```

---

## Future: enabling AI Coach

When you want to turn on the AI Coach later:
1. Upgrade the project to the **Blaze (pay-as-you-go)** plan.
2. The `functions/` directory still contains the Gemini-powered Cloud Function — re-add the `functions` block to `firebase.json`, set `firebase functions:secrets:set GEMINI_API_KEY`, build with `npm --prefix functions run build`, and `firebase deploy --only functions`.
3. Swap the Coach page back to call `callCoach` from `queryClient.ts`.
