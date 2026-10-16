export function resolveApiUrl(value: string | undefined, development: boolean): string {
  const candidate = value || (development ? 'http://localhost:4000' : '');
  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error('Configure EXPO_PUBLIC_API_URL with your API origin.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('API URL must not contain credentials, query parameters or fragments.');
  const host = url.hostname.toLowerCase();
  const privateHost = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '[::1]' || /^(0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  if (!development && (url.protocol !== 'https:' || privateHost)) throw new Error('A public HTTPS EXPO_PUBLIC_API_URL is required for a store build.');
  return candidate.replace(/\/$/, '');
}
