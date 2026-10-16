# Fitness App Mobile

Expo / React Native fitness and nutrition app. Start with the [production feature status and handoff](docs/PRODUCTION_HANDOFF.md) to continue the release work. See the [feature inventory, findings and production checklist](docs/PRODUCTION_READINESS.md) and [live backend endpoint results](docs/ENDPOINT_RESULTS.md). Public production release still has open gates listed there.

## Requirements

- Node 22 (`nvm use`, using `.nvmrc`) and npm.
- Backend running with its migrations and RBAC seed applied.
- A native development or release build for camera pose detection, on-device OCR and Bluetooth. Expo Go does not provide these native modules.
- iOS 15.5 or later; Xcode/CocoaPods for local iOS builds, or the Android SDK for local Android builds.

## Setup

```sh
npm ci
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend address.
npx expo run:ios
# Or: npx expo run:android
```

These build commands generate native projects if necessary. Existing generated projects must be regenerated after native plugin/model changes. Review any manual native edits before doing a clean prebuild.

On a physical phone, `localhost` is the phone itself. Use a reachable development machine address. Release builds require an HTTPS `EXPO_PUBLIC_API_URL`. Provider credentials belong only in the backend environment; never use an `EXPO_PUBLIC_` variable for private keys.

Register an account, verify your email, then complete the profile. Sign-in and verified email are required for account API calls. Forgot-password links and verification emails use the backend-hosted account page; see [A03 setup and verification](docs/A03_AUTH_LIFECYCLE.md). Legacy device identifiers no longer authorize access. Account export/deletion is available under Account privacy; see [A04 policy and verification](docs/A04_ACCOUNT_LIFECYCLE.md). Native sharing requires rebuilding the Android/iOS app, and hosting retention/device acceptance remain release gates.

The committed EAS configuration currently references an existing Railway API URL. Confirm the intended staging/production environments before building or publishing; the readiness work did not deploy to that host.

## Verification

```sh
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform ios --platform android
```

JavaScript exports do not validate native modules or device behavior. See [native validation](docs/NATIVE_VALIDATION.md). Today’s meal cache reconciles with server records when refreshed, after pending changes upload; offline data stays cached. History hydrates older meals in navigable four-week windows, including after reinstall; saved totals remain available offline. See [N04 recovery validation](docs/N04_MEAL_HISTORY.md). Other daily-stat synchronization still needs the work described in the production checklist.

Legacy device-ID upgrades use independently reviewed migration codes, never device-ID authorization. See [A05 migration policy and operator procedure](docs/A05_LEGACY_ACCOUNT_MIGRATION.md).
