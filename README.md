# Fitness App — Mobile (Expo + TypeScript)

AI-powered fitness & nutrition coaching app. MVP scaffold.

## Requirements
- Node.js **>= 18.18** (Expo 54 requires this). Upgrade via `nvm install 20 && nvm use 20` if needed.
- npm or yarn
- Expo Go app on your phone, or an iOS/Android simulator

## Setup
```bash
npm install
cp .env.example .env   # edit EXPO_PUBLIC_API_URL if backend is not on localhost
npx expo start
```

Scan the QR with Expo Go, or press `i` / `a` for simulator.

## Backend connection
- Defaults to `http://localhost:4000`.
- On a **physical device**, `localhost` will not resolve. Set `EXPO_PUBLIC_API_URL` to your Mac's LAN IP, e.g. `http://192.168.1.10:4000`.

## Structure
```
src/
  navigation/   RootNavigator, MainTabs
  screens/      Onboarding, Dashboard, LogMeal, Chat, Summary
  api/          axios client + endpoint wrappers
  logic/        (future) calorie + recommendation engines
  types/        shared TS types
  components/   (future) shared UI
```

## Next step
Calorie engine + rule-based workout recommendations (backend + wiring into Dashboard).
