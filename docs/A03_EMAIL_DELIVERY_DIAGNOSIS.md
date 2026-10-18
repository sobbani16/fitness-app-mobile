# Verification email diagnosis — October 17, 2026

Read-only investigation following a report of missing verification mail around 12:30 PM Eastern on October 16. No messages were sent, accounts verified manually, retry counters reset, secrets changed or deployment triggered.

## Evidence

- Railway backend sender is `Humai Fitness <onboarding@resend.dev>`. The Resend key and link-signing secret are present; the HTTPS action origin matches the beta backend.
- Three verification jobs were created October 16 at 16:44:45–16:45:44 UTC (12:44–12:45 PM America/New_York, EDT). Each has five attempts, no provider-acceptance timestamp and no consumption timestamp. Without the reported account address, these cannot be individually attributed to the friend.
- Prior deployment `2dc96040-1fec-4ba2-9c0f-8621f7f9f8a8` contains **15** `Auth email delivery failed` entries from 16:44:47 to 17:00:57 UTC. The current successful deployment `2860d9ab-87c3-45e3-850d-0cff3e1c25d1` was created October 17 at 03:25 UTC; its logs do not contain those historical attempts.
- An earlier verification job was provider-accepted and consumed. This does not establish delivery to arbitrary recipients.
- The worker stops after five attempts. It logs a job ID and attempt count, but discards the provider HTTP status/error body. Thus the exact historical Resend rejection reason cannot be recovered from application logs.
- Read-only Resend domain-list requests returned non-success responses, so domain inventory/API key permissions were not confirmed. No send probe was performed and no invalid-key conclusion is made from those read failures.

## Confirmed configuration blocker

The shared `resend.dev` test sender only permits delivery to the email associated with the Resend account. It does not support friend/tester invitations to arbitrary addresses. This is a confirmed sender restriction and is consistent with the failed external verification jobs, though the historical provider response was not retained.

Official source: [Resend test-domain restriction and resolution](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## Resolution

1. Add a domain you own in [Resend Domains](https://resend.com/domains), publish the requested DNS records and wait for verified status. A Gmail address or a GitHub Pages privacy-policy URL does not give control of the sending domain.
2. Set Railway `AUTH_EMAIL_FROM` to a sender on that verified domain, for example `Humai Fitness <accounts@your-verified-domain.com>`. Ensure the server-only API key permits sending for that domain. Apply/redeploy the configuration.
3. Have the tester sign in to the existing unverified account and use **Resend verification**. This creates a fresh job instead of reviving an exhausted or expired one. Existing account-specific/IP rate limits still apply.
4. Check the active Railway deployment logs, Resend request/email activity and actual inbox delivery. Provider acceptance is not proof of inbox delivery. No new mobile build is required for a sender-only backend configuration change.

External verification-email acceptance remains blocked until these configuration steps and inbox verification succeed. No account addresses, tokens, keys or verification links are included in this report.

## Owner-provided sending domain

Owner confirmed `prashanthsobbani.com` on October 17. Read-only DNS lookup returned NS1 nameservers (`dns1`–`dns4.p01.nsone.net`); the exact DNS-management account/provider UI is not confirmed. No TXT/MX answers were returned at the root or expected default Resend names (`resend._domainkey` TXT, `send` TXT/MX). This does not establish whether other custom selectors/subdomains exist. Resend domain inventory could not be read with the configured key.

Next: add `prashanthsobbani.com` in Resend, copy its exact generated sending/DKIM records into the authoritative DNS provider, and wait for verification. Proposed sender after verification: `Humai Fitness <accounts@prashanthsobbani.com>`. No DNS, Resend configuration or Railway sender was changed. Do not guess the domain-specific DKIM value or replace unrelated records.

## Recheck — October 17, 2026, 16:15 UTC

The sender change is deployed: Railway deployment `16a94af5-31d2-4b0e-b86f-2bc0467a476d` succeeded after the sender became `Humai Fitness <accounts@prashanthsobbani.com>`. A new verification job created at 15:16:20 UTC exhausted five attempts with no provider acceptance. Five delivery-failure entries are present in that deployment, ending 15:31:27 UTC. No newer job was found at recheck.

Cloudflare DNS and direct authoritative queries still find no default Resend records. The authoritative NS1 server returns NXDOMAIN for `resend._domainkey.prashanthsobbani.com` TXT and `send.prashanthsobbani.com` MX; SOA identifies Netlify domain management. Add the exact Resend-generated records to the authoritative Netlify DNS zone, not only a registrar's inactive DNS zone. If Resend uses a different domain/subdomain/selector, its DNS page is needed to compare the exact names. Sender configuration alone does not verify a domain. No retries/emails or remote configuration changes were triggered by this recheck.

## Screenshot confirmation

Owner screenshots show the registrar warning that its DNS edits are inactive while third-party nameservers are selected. The Resend domain remains Pending and its `resend._domainkey` TXT record remains Pending. This confirms the expected selector matches the authoritative lookup. Add the full Resend-generated TXT and sending records in Netlify DNS; the truncated DKIM screenshot value must not be used as a record value. Keep existing nameservers and website records. No remote changes were made.

## DNS recheck — October 18, 2026, 07:22 UTC

Authoritative DNS now publishes a TXT record at `resend._domainkey.prashanthsobbani.com` and both expected CNAMEs: `rsend` → `rsend.forge.rmta.net`, `send` → `send.forge.rmta.net`. These CNAMEs match the owner's Resend screenshot and supersede the earlier default MX/SPF assumption. The full DKIM value has not been compared with Resend's truncated screenshot; provider Verified status remains to be confirmed.

No new verification job exists since October 17 15:16 UTC; that job exhausted all five attempts before the DNS correction and has no provider acceptance. Once Resend confirms Verified, the user must request a fresh verification email through the existing app flow. This check sent no messages and changed no remote data.
