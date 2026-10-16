import { File, Paths } from 'expo-file-system';

function photos(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(item => photos(item, into));
  else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'photoUri' && typeof entry === 'string') into.add(entry);
      else photos(entry, into);
    }
  }
  return into;
}
function parse(value: string | null): unknown { try { return JSON.parse(value || 'null'); } catch { return null; } }
export function removeOwnedPhotoCopies(owned: ReadonlyArray<readonly [string, string | null]>, others: ReadonlyArray<readonly [string, string | null]>) {
  const keep = photos(others.map(([, value]) => parse(value)));
  const remove = photos(owned.map(([, value]) => parse(value)));
  for (const uri of remove) {
    if (keep.has(uri)) continue;
    // Only app-created camera/picker cache copies, never the user's photo library or arbitrary files.
    const roots = ['ImagePicker/', 'Camera/'].map(dir => new URL(dir, `${Paths.cache.uri.replace(/\/$/, '')}/`).href);
    let canonical: string;
    try { canonical = new URL(decodeURIComponent(uri)).href; } catch { continue; }
    if (!roots.some(root => canonical.startsWith(root)) || !/\.(jpe?g|png|heic|webp)$/i.test(canonical)) continue;
    const file = new File(canonical);
    if (file.exists) file.delete();
  }
}
