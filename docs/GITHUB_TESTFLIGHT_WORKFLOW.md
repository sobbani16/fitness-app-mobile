# Manual GitHub TestFlight workflow

Workflow: `.github/workflows/testflight.yml`, displayed as **iOS TestFlight** in GitHub Actions. It runs only through **Run workflow** (workflow_dispatch), never automatically on a push or pull request.

## One-time setup

1. Ensure this workflow is pushed to the mobile repository's default branch (`main`).
2. Sign into Expo as an account with access to `@sobbani16/fitness-app-mobile`. Create a personal access token at https://expo.dev/settings/access-tokens .
3. In GitHub repository **Settings → Secrets and variables → Actions → New repository secret**, create **EXPO_TOKEN** with that token. Do not put it in source code, a workflow input or chat.
4. EAS must retain the existing iOS distribution certificate, provisioning profile and App Store Connect submission key. These were configured during build 5. If they expire or are revoked, repair them locally using `eas credentials --platform ios`; CI cannot answer Apple login prompts.

## Run

Open the mobile repository's **Actions → iOS TestFlight → Run workflow**. Select `main` (or another trusted branch containing the intended changes) and click **Run workflow**. Each run can consume EAS build quota and increments the remote iOS build number.

The workflow installs locked npm dependencies with Node 22.20.0, checks release configuration, TypeScript, ESLint and tests, then calls EAS CLI 20.0.0 (the version used for successful build 5). EAS runs the native build using the existing `testflight` profile and queues submission of that exact build only after build success. The job waits for the build, but Apple processing/submission completion must be checked using the EAS links in the logs. No public App Store review/release is requested.

One GitHub run executes at a time. A cancellation/timeout does not necessarily cancel EAS cloud work. Check existing EAS builds/submissions before rerunning to avoid duplicate builds. GitHub concurrency does not coordinate builds started manually outside this workflow.

Public beta settings come from `eas.json`; `.env` is excluded from EAS uploads and dotenv loading is disabled during CI checks. Backend secrets stay on Railway. The EXPO_TOKEN is provided only to the steps that need Expo authentication.

After Apple processing, assign the build to the `test` internal group if it is not automatically assigned, then install via TestFlight. GitHub workflow success is not signed-device acceptance.

Validation: workflow YAML parsed locally and trigger/job invariants checked. Local release checks, type checking, lint and tests are recorded in the handoff. A hosted GitHub Actions run has not been performed; EXPO_TOKEN must be configured by the owner first.

References: https://github.com/expo/expo-github-action and https://docs.expo.dev/build/automate-submissions/ .
