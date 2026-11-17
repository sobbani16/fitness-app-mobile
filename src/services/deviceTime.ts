// OS-reported IANA zone (e.g. "America/New_York") — no location permission needed.
export function deviceTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}
