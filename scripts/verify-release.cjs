const fs = require('node:fs');
const app = require('../app.json').expo;
const eas = require('../eas.json');
const profileName = process.env.EAS_BUILD_PROFILE || 'production';
function profile(name, seen = new Set()) {
  if (seen.has(name) || !eas.build[name]) throw new Error('Invalid EAS profile inheritance');
  seen.add(name);
  const own = eas.build[name], base = own.extends ? profile(own.extends, seen) : {};
  return { ...base, ...own, env: { ...base.env, ...own.env }, ios: { ...base.ios, ...own.ios } };
}
const build = profile(profileName), errors = [];
const env = {...build.env,...process.env};
const assert = (condition, message) => { if (!condition) errors.push(message); };
function https(value) {
  try { const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&!/^(localhost|127\.|10\.|192\.168\.|0\.|\[::1\])/.test(u.hostname)&&!u.hostname.endsWith('.local'); } catch { return false; }
}
// EAS resolves the fingerprint both before and after setting EAS_BUILD_PROFILE.
// A different native config at those stages caused the first TestFlight build to fail.
const { getConfig } = require('@expo/config');
const { isDeepStrictEqual } = require('node:util');
const originalProfile = process.env.EAS_BUILD_PROFILE;
let localConfig, cloudConfig;
try {
  delete process.env.EAS_BUILD_PROFILE;
  localConfig = getConfig(process.cwd()).exp;
  process.env.EAS_BUILD_PROFILE = profileName;
  cloudConfig = getConfig(process.cwd()).exp;
} finally {
  if (originalProfile === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = originalProfile;
}
assert(isDeepStrictEqual(localConfig, cloudConfig), 'Native Expo configuration must match with and without EAS_BUILD_PROFILE.');
assert(cloudConfig.updates?.enabled === false, 'Keep OTA updates disabled for the initial beta.');
assert(build.distribution === 'store', 'Store distribution is required.');
assert(build.ios.simulator === false, 'Use a physical-device iOS store build.');
assert(build.autoIncrement === true && eas.cli.appVersionSource === 'remote', 'Remote build-number auto-increment is required.');
assert(!!app.ios.bundleIdentifier && !!app.extra?.eas?.projectId, 'Bundle identifier and EAS project ID are required.');
assert(https(env.EXPO_PUBLIC_API_URL), 'Set a public HTTPS EXPO_PUBLIC_API_URL.');
assert(https(env.EXPO_PUBLIC_PRIVACY_POLICY_URL), 'Set the real public HTTPS EXPO_PUBLIC_PRIVACY_POLICY_URL.');
assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL || ''), 'Set EXPO_PUBLIC_SUPPORT_EMAIL to a monitored inbox.');
for (const name of Object.keys(env)) assert(!/^EXPO_PUBLIC_.*(SECRET|PASSWORD|TOKEN|API_KEY|DATABASE)/i.test(name), `Remove secret-bearing public variable ${name}.`);
assert(fs.existsSync('modules/fitness-ocr/ios/FitnessOcrModule.swift'), 'The local iOS OCR module must be included.');
assert(fs.existsSync('assets/models/pose_landmarker_lite.task'), 'The pose model asset must be included.');
if (errors.length) { for (const message of errors) console.error(`BLOCKED: ${message}`);process.exitCode=1; }
else console.log(`Local ${profileName} configuration checks passed. Backend availability, Apple signing and device acceptance still require verification.`);
