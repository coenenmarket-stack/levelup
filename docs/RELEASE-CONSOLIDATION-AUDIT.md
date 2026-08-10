# Release consolidation audit notes

Branch: `cursor/release-consolidation-4ef7`  
Based on merged Phase 4.5 tip `22605b6` on `cursor/app-store-launch-assets`.

## RELEASE (ship with conservative flags)

- Auth + onboarding + existing-user restore
- Home (level/XP, next action, daily quests, streak, weekly, path/goal)
- Daily quests, weekly challenges, streaks, achievements
- Career paths, certifications, side hustles
- Personalization + Goals
- AI Coach UI (graceful fallback if CF missing)
- Local retention notifications (Settings → Notifications · Progress)
- Privacy/Help/Settings (non-social sections)
- Capacitor iOS project + Codemagic `ios-testflight-launch` config

## HIDE (until infra verified — `LAUNCH_FLAGS`)

- Friends, Invite/referrals
- Shared challenges & parties hub
- Leaderboards
- Social home card
- Remote push opt-in / registration
- Email preference UI
- Notification inbox

## DEFER

- Achievement/goal milestone auto-push (prefs reserved only)
- Goal-reminder / social-digest email jobs
- Rewards `/shop` promotion into primary nav
- Deleting unused CF `generateQuests`
- Broad privacy rewrite of `publicProfiles` readability
- Full offline sync

## Major issues addressed in consolidation

- Menu overload → grouped Play/Grow/Progress/Social/Account with flag filters
- Home social + push cards gated
- Continue Journey social tiles removed; Hero → `/profile`
- Settings nested: Account, Personalization, Notifications·Progress, Privacy/Social/Email (when flagged), App, Security
- Invite hidden dev activate control removed
- FeatureUnavailable on direct routes to gated features
- Stale DEPLOY.md Coach “Coming Soon” corrected
