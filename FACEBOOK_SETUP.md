# Facebook + Apple Login setup

**Phase 1 (shipped):** invite codes + share links on Friends. That is the primary discovery path.

**Phase 2 (optional):** Facebook Login, Apple Sign In (App Store 4.8 when offering other social logins), and **Find Facebook friends** via Graph `user_friends` after Meta App Review. Leave `VITE_FACEBOOK_APP_ID` unset to keep Facebook UI hidden.

Invite codes remain the primary way to add anyone forever — Facebook Graph is sparse.

## 1. Meta (Facebook) Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com/) → Create App → type **Consumer** / **Authenticate and request data from users with Facebook Login**.
2. Add product **Facebook Login** → settings:
   - Valid OAuth Redirect URIs:
     - `https://level-up-life-73702.web.app/__/auth/handler`
     - `https://level-up-life-73702.firebaseapp.com/__/auth/handler`
3. Copy **App ID** and **App Secret**.
4. In Firebase Console → Authentication → Sign-in method → **Facebook** → enable → paste App ID + App Secret.
5. Request permissions:
   - `email`, `public_profile` (default)
   - `user_friends` (needs **App Review** before production friend-find works)

## 2. Client env

Create `client/.env` (or Codemagic env var) with:

```bash
VITE_FACEBOOK_APP_ID=your_numeric_app_id
```

Rebuild the web app / TestFlight IPA after setting this — the Auth buttons call Facebook only when this is set.

## 3. Apple Sign In (required with social logins — App Store 4.8)

1. Apple Developer → Identifiers → App ID `com.coenenmarket.leveluplife` → enable **Sign In with Apple**.
2. Create a **Services ID** for web (e.g. `com.coenenmarket.leveluplife.web`) with:
   - Domains: `level-up-life-73702.web.app`, `level-up-life-73702.firebaseapp.com`
   - Return URLs: `https://level-up-life-73702.web.app/__/auth/handler`
3. Create a Sign in with Apple **Key** (.p8), note Key ID + Team ID.
4. Firebase Console → Authentication → Sign-in method → **Apple** → enable → paste Services ID, Team ID, Key ID, private key.

Capacitor iOS: enable the **Sign in with Apple** capability on the Xcode App target (Signing & Capabilities).

## 4. Deployed backend pieces

Already in code / deploy with functions:

| Function | Purpose |
|----------|---------|
| `createNativeFacebookSession` / `claimNativeFacebookSession` | Safari bridge for Capacitor (same pattern as Google) |
| `linkFacebookAccount` | Maps `facebookId` → `facebookIndex/{id}` + `publicProfiles` |
| `findFacebookFriends` | Graph `/me/friends` → Level Up matches |

Hosted page: `https://level-up-life-73702.web.app/native-facebook-auth.html`

## 5. What “Find Facebook friends” can see

Facebook only returns friends who:

1. Also authorized **this** app, and  
2. Granted `user_friends` (after Meta review).

So the list is often small until both sides use Facebook Login in Level Up. **Invite codes** still work for everyone.

## 6. Smoke checklist

- [ ] Firebase Facebook + Apple providers enabled  
- [ ] `VITE_FACEBOOK_APP_ID` set and app rebuilt  
- [ ] Web: Continue with Facebook / Apple on Auth  
- [ ] Friends → Find Facebook friends (expect empty or matches)  
- [ ] TestFlight: Facebook opens Safari bridge and returns to app  
