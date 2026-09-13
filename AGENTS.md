# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
**Level Up Life** is a gamified habit-tracking RPG. There are two code units:
- **Web/mobile client** — React 18 + Vite + Tailwind + Capacitor (iOS). This is the app you run and test in the browser during dev.
- **Firebase Cloud Functions backend** (`functions/`) — Node 20, TypeScript.

There is **no local Express/SQL server** and **no docker-compose/Makefile**. Standard commands live in the root `package.json` and `functions/package.json` scripts.

### Key non-obvious facts
- **The client talks to the LIVE Firebase project `level-up-life-73702`** (config is hardcoded in `client/src/lib/firebase.ts`). There is **no Firebase emulator wiring** in the client, so `npm run dev` against live Firebase is the working end-to-end dev path: real email/password signup, Firestore reads/writes, and quest completion all work in the browser with no extra setup or secrets.
- **Core game logic runs client-side, not in Cloud Functions.** `client/src/lib/queryClient.ts` maps the app's `apiRequest("POST", "/api/...")` calls directly to Firestore / local logic (`finalizeOnboardingLocal`, `completeQuestLocal`, etc.). So onboarding and quest completion work WITHOUT deploying any Cloud Functions. Functions are only needed for AI Coach (`aiCoach`, Gemini), weekly emails (Resend), and social callables — all optional and soft-fail if absent.
- **Vite dev server runs on port 5173** (not the 5000 in `firebase.json`, which is the Firebase Hosting emulator port). Use `npm run dev` then open `http://localhost:5173/`.
- **Onboarding gotcha for automated UI testing:** on the "Create your hero" step, the character name field is empty by default — "Aurelia" is only placeholder text. The Continue button stays disabled (faded) until a name is actually typed. Type a real name before expecting Continue to work.
- **No ESLint/Prettier is configured.** The lint/typecheck gate is `npm run check` (plain `tsc`).
- **Tests** use Node's built-in test runner via `tsx` (`npm run test:unit`) — pure logic unit tests, no emulator/network required.

### Common commands
| Task | Command | Notes |
|------|---------|-------|
| Run client (dev) | `npm run dev` | Vite on `http://localhost:5173/`, hits live Firebase |
| Typecheck / lint | `npm run check` | `tsc`, no emit |
| Unit tests | `npm run test:unit` | `tsx --test`, no network needed |
| Build client | `npm run build` | outputs to `dist/public` |
| Build functions | `npm run functions:build` | runs `tsc` in `functions/` |

### Firebase CLI / emulators
`firebase-tools` is **not** a project dependency and is not required for client dev or tests. It's only needed for `functions/` emulator scripts (`npm --prefix functions run serve`) and deploys — install `firebase-tools` on demand if you need those, and note deploys require Firebase auth + a Blaze-plan project (see `DEPLOY.md` and `docs/FINAL-MACHINE-SETUP.md`).

### iOS (Capacitor)
`npm run cap:sync` / `cap:open` target Xcode and are not runnable in this Linux cloud environment. iOS release/build goes through Codemagic (`codemagic.yaml`); see `IOS.md` and `docs/FINAL-MACHINE-SETUP.md`.
