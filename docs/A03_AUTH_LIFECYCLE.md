# A03 — Password recovery and email verification

Implemented and locally verified October 13, 2026. **Staging email delivery and signed iOS/Android acceptance remain pending.** No production deployment or real email send was performed.

## User behavior

- Registration signs the user into a restricted session and queues a verification email. Account data remains inaccessible until verification. Existing accounts are also unverified after migration; there is no automatic backfill that asserts ownership.
- The app offers resend, verification refresh, sign out, and “Forgot password?”. Returning to the app refreshes verification. Backend enforcement applies independently of the mobile screen and cached sessions.
- Email links open the backend-hosted `/auth/action` page on any device. Verification requires an explicit button press. Recovery requires a new password and confirmation. Users then return to the app; a custom URI scheme is not required.
- Reset links expire after 30 minutes; verification links after 24 hours. A successful action invalidates its sibling links. A password reset also invalidates pending verification links and revokes every session. Reset does not automatically verify an email or sign the user in.
- Requesting another email does not invalidate an earlier valid link. This avoids letting an anonymous resend request disable a link the owner is already using.

## Implementation

Backend: `src/routes/auth.js`, `src/services/authLifecycle.js`, `src/services/authEmail.js`, `src/middleware/requireVerifiedEmail.js`, `src/public/auth-action.*`, and migration `20261013120000_auth_lifecycle`.

Mobile: `src/components/AuthGate.tsx`, verification metadata in `src/storage/session.ts`, and verification-required handling in `src/api/client.ts`.

Random 256-bit action identifiers are used with HMAC-SHA256 and a server-only key to derive bearer tokens. The database stores a SHA-256 token hash and the identifier, never the bearer token. Keeping the signing key outside the database allows the durable queue to reconstruct a link without plaintext token storage. User-row locks and conditional consumption serialize reset, verification, issuance and login; session revocation happens in the password-update transaction.

Recovery/resend return the same 202 response for unknown, ineligible and address-throttled accounts. Provider calls run asynchronously, outside request handling. PostgreSQL rate limits survive restarts and work across instances: 30 auth POSTs per IP/subnet per 15 minutes, 10 login attempts per email per 15 minutes, and 3 emails per address/purpose per 15 minutes. IPv4-mapped IPv6 addresses are normalized; IPv6 limits group /56 networks. IP throttling returns 429 and Retry-After. The general API rate limiter remains an additional process-local control.

The email worker runs within the long-lived backend process, uses row leases and Resend idempotency keys, retries up to five times with exponential backoff, and skips consumed/expired links. Timestamps in queue SQL explicitly use UTC. Hourly cleanup removes actions seven days after expiry and rate buckets one day after expiry. Failed deliveries log only job identifier/attempt, never the token, email address or provider response body.

The page stores tokens in URL fragments, clears the address bar, sends tokens only in POST JSON, disables caching, uses no-referrer and a self-only script policy, and has no third-party assets. Refreshing after the fragment is cleared requires reopening the original email link. GET requests and email scanners do not consume links.

## Required service setup

Resend is the transactional email transport; the existing application auth system remains authoritative. Implementation follows the [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [idempotency guidance](https://resend.com/docs/dashboard/emails/idempotency-keys), and [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

1. Verify a sending domain in Resend and configure its required DNS records. Use a sending-only API key scoped to the domain. Disable click/open tracking for auth email.
2. Configure backend secrets (never Expo public variables):
   - `RESEND_API_KEY`: sending key.
   - `AUTH_EMAIL_FROM`: verified sender, e.g. `Fitness <accounts@your-domain>`.
   - `AUTH_LINK_SECRET`: stable random 32-byte hex secret; generate with `openssl rand -hex 32`. Share the same secret across backend instances and keep it in the deployment secret manager.
   - `AUTH_PUBLIC_URL`: HTTPS origin of this backend, e.g. `https://api.your-domain`. It must serve `/auth/action`, `/auth/action.js`, `/auth/action.css`, and the auth API without another login wall. No path, credentials, query or fragment. HTTP localhost is allowed only outside production.
3. Run `npm run db:generate`, `npm run db:deploy`, and the existing RBAC seed before starting the updated backend. Start with `npm start`; startup fails if auth email configuration is absent or invalid. This worker requires a persistent Node process, not request-only serverless execution.
4. Set the mobile `EXPO_PUBLIC_API_URL` to the same environment. No mobile provider key or native linking configuration is needed.
5. Configure `TRUST_PROXY_HOPS` only for the actual proxy topology, and ensure proxies/APM do not log auth request bodies or rewrite/log fragment tokens. Do not derive email-link origins from request headers.
6. Monitor queue failures and oldest undelivered eligible job age. Investigate provider suppression, invalid sender, quotas and exhausted attempts. A generic request response confirms acceptance, not inbox delivery. After fixing a delivery outage, the user can resend. Do not reset attempt counters indiscriminately.

Key rotation: outstanding links already emailed remain valid against their stored hashes. Undelivered jobs signed by the old secret fail closed rather than sending unusable links. Have users resend, or explicitly invalidate outstanding actions as part of incident response. Changing the public origin/sender while a job is retrying can conflict with provider idempotency; drain or invalidate pending jobs during that change.

## Repeatable tests and evidence

Backend integration tests require a **disposable** PostgreSQL database named exactly `fitness_auth_readiness` on localhost. The suite deletes fixture tables and refuses other database names/remote hosts. Never point it at application or production data.

```sh
# In fitness-app-backend, with Node 22 and local PostgreSQL running:
export DATABASE_URL=postgresql://YOUR_USER@127.0.0.1:55432/fitness_auth_readiness
npm run db:generate
npm run db:deploy
npm run test:auth
npm test -- --silent

# In fitness-app-mobile:
npm test -- --runInBand --silent
npx tsc --noEmit
```

The integration suite sets its own test-only email configuration, explicitly disables the authentication bypass and uses the real Express routes, password hashing, PostgreSQL migrations and transactions. Only outbound email transport is stubbed; no real emails are sent. The email-page JavaScript is executed against a simulated DOM, with its fetch calls routed into the real HTTP endpoints. This is not visual browser or device acceptance.

Verified locally:

- All 15 migrations applied to a clean isolated PostgreSQL database.
- Backend regression: 26 suites, 219 tests passed.
- Auth integration: 13 tests passed, covering registration through verification and protected access; email-page script; recovery through new-password login; expired/malformed/wrong-purpose/replayed tokens; concurrent consumption; sibling invalidation; all-session revocation; login/reset race; generic responses; atomic address/IP limits; queue retries/idempotency and concurrent workers; secret-free token storage; configuration and email-change rejection.
- Mobile: 10 suites, 67 tests passed, including five auth-screen tests for recovery, registration/verification gate/resend, revoked sessions, rate-limit/network errors and stale foreground responses.
- TypeScript check passed.
- Browser visual verification was blocked by the browser tool connection error (`sandboxPolicy` missing) before any page opened. No claim of rendered-page or signed-device acceptance.

Before release, verify real inbox delivery on the configured domain, spam behavior, email-scanner behavior, expired/reused links in real browsers, foreground/background app return, old-session rejection on another device, accessibility/keyboard layouts, and signed iOS/Android behavior against staging. Provider credentials, a verified domain and staging URL were not available for this local verification.
