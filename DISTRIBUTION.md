# Sharing the app with friends for testing

You have **three** realistic options. Easiest → most polished:

| Option | Effort | iOS friends | Android friends | Cost |
| --- | --- | --- | --- | --- |
| Expo Go (dev) | 5 min | ✔ (same Wi-Fi / tunnel) | ✔ | free |
| EAS **preview** build (ad-hoc + APK) | ~30 min first time | ✔ (device UDID required) | ✔ (just an APK link) | free tier OK |
| **TestFlight** (iOS) + Internal App Sharing (Android) | 1–2 h | ✔ up to 10 000 testers | ✔ | **$99/yr Apple** |

## ⚠️ Backend first

Before *any* of these options, your friends' phones need to reach your backend. `http://localhost:4000` only works on your Mac. Pick one:

**Quickest — ngrok tunnel (free):**
```bash
brew install ngrok
ngrok http 4000
# copy the https URL it prints, e.g. https://abc-123.ngrok-free.app
```
Set that URL as `EXPO_PUBLIC_API_URL` (in `.env` or in `eas.json` under the build profile's `env`).

**Real deploy:** push `fitness-app-backend` to Railway, Render, or Fly.io (Express + one env var = 1-click deploy).

---

## Option A — Expo Go (only if they're nearby / tech-friendly)

1. `npx expo start --tunnel` in `/Users/sobbani/Desktop/fitness-app-mobile`.
2. Send them the QR code. They install **Expo Go** from the App Store / Play Store and scan it.
3. Limitation: the **real** BLE and **real** ML detection don't run here (both are stubbed mocks in Expo Go). The mocks still work, so the full UX is testable.

---

## Option B — EAS preview builds (recommended)

This ships a **real app** they install once — no Metro, no dev tooling on their side.

### 0. One-time setup
```bash
npm i -g eas-cli
cd /Users/sobbani/Desktop/fitness-app-mobile
eas login              # free Expo account
eas init               # creates the project on EAS servers
```

### 1. Fill in your backend URL
Edit `eas.json` → replace `REPLACE-WITH-YOUR-PUBLIC-BACKEND-URL` under the `preview` profile.

### 2. Android — give them an APK
```bash
eas build --profile preview --platform android
```
When it finishes, EAS prints a URL. Send that link to your friends; they tap it on their phone, allow "install unknown apps", done. No Play Store involvement.

### 3. iOS — a bit more work (no Apple account? skip to Option C)
You need a **paid Apple Developer account** ($99/yr) for any iOS sideload.

- Ad-hoc: collect each friend's device UDID (EAS has a flow for this: `eas device:create`), then
  ```bash
  eas build --profile preview --platform ios
  ```
  EAS auto-provisions the devices and gives you an install URL.
- Max 100 iOS devices per year on the ad-hoc method. For more or for a nicer UX, use TestFlight (Option C).

### 4. Keep iterating fast with OTA updates
After the native build ships once, most JS changes don't require a new build:
```bash
eas update --branch preview --message "fix meal logging bug"
```
Your friends open the app → it fetches the new JS silently on next launch.

---

## Option C — TestFlight (iOS) + Google internal testing (Android)

Best UX for friends, most setup for you.

### iOS → TestFlight
```bash
eas build --profile production --platform ios --auto-submit
```
- First run will prompt you for Apple Developer credentials and create the app on App Store Connect.
- After ~1 hour Apple review of the first build (subsequent ones are instant), you get a TestFlight **public link** you can share with anyone.
- Friends install the **TestFlight** app and tap your link — no UDIDs needed.

### Android → Google Play internal testing
```bash
eas build --profile production --platform android --auto-submit
```
- One-time Google Play Console setup ($25 one-time). Create an "Internal testing" track.
- EAS auto-submits the AAB. Share the opt-in link with friends.

---

## Which should you do right now?

If you just want **5 friends on Android** to poke at it tonight: **Option B → Android APK only**.

If any of them have iPhones: add `--platform ios` once you've got the Apple Developer account. Or give them Expo Go for now and upgrade to TestFlight later.

---

## Reminders

- **Backend must be public** — `localhost` is not reachable from their phones. Use ngrok or deploy.
- **Env vars** — if you change the backend URL, either rebuild with EAS or set it via `EXPO_PUBLIC_API_URL` in `eas.json` and run `eas update`.
- **Permissions** — the app already asks for camera/photos/location. Nothing else needed for the mock BLE or mock detection. When you enable *real* BLE / camera ML, add the corresponding iOS Info.plist strings + Android runtime permissions (and rebuild).
