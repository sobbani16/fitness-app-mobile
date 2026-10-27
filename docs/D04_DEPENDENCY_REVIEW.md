# D04 dependency review — October 19, 2026

Compatible fixes applied locally: backend qs 6.14.2 → 6.16.1; mobile PostCSS 8.4.49 → 8.5.31 and ws 7.5.10 → 7.5.13. Exact qs/PostCSS overrides keep pinned transitive consumers on patched versions. Unrelated React Native tooling upgrades from audit fix were removed; no Expo/RN major migration was performed. Both lockfiles passed npm ci.

Full npm audit: backend 39 → 38 affected packages (33 high, 5 moderate); mobile 64 → 62 (48 high, 14 moderate). No critical findings. These include dependency-chain counts, not distinct vulnerabilities. Production-dependency-only audits still report backend 3 high and mobile 25 high/14 moderate; mobile production dependency labels include build tools, so they are not proof of device reachability. Full machine-readable snapshots are BACKEND_DEPENDENCY_AUDIT.json and MOBILE_DEPENDENCY_AUDIT.json.

Remaining paths reviewed:
- Backend deepmerge-ts through Prisma configuration is a deployment/configuration dependency. No direct application import was found; this is not a proof of non-exploitability. Prisma major migration needs separate compatibility validation.
- braces/sprintf-js propagate through Jest, globbing and watcher tooling. No direct app import was found. Treat untrusted repository/build inputs as relevant; do not dismiss development dependency findings. [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version.
- Mobile image-size is used by Metro for asset processing. Its reported fix requires leaving the currently selected major; review parser compatibility and untrusted asset inputs before changing it.
- node-forge comes through Expo CLI/code-signing tools and expo-updates. OTA is disabled in this beta, but this does not remove build-tool exposure. [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
- uuid through Xcode/project tooling and sprintf-js through YAML/configuration tooling remain unresolved. Do not globally substitute incompatible majors to silence audit.

Validation: 296 backend tests, 37 authenticated integration tests, 196 mobile tests; TypeScript, release configuration, Expo dependency compatibility and combined iOS/Android exports passed. Lint: zero errors, 30 existing warnings. Native signed-device validation was not performed. No push, deployment or cloud build.

D04 remains OPEN. No risk exception has been approved. Remaining advisories need compatible upstream patches/framework migration or an explicit owner/security review before public release. npm audit fix --force was not used; its suggested downgrades/major changes were not accepted. [npm audit behavior](https://docs.npmjs.com/cli/commands/npm-audit/).
