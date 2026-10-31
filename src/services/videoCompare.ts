import { VideoResult } from '../api/videos';

/** Route params can be absent or malformed after direct entry/state restoration. */
export function isComparableVideo(value: unknown): value is VideoResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as VideoResult;
  return ['videoId', 'title', 'channelTitle', 'why', 'description'].every(key => typeof v[key as keyof VideoResult] === 'string')
    && Boolean(v.videoId) && Array.isArray(v.tags) && v.tags.every(tag => typeof tag === 'string')
    && (v.viewCount == null || Number.isFinite(v.viewCount))
    && [v.thumbnailUrl, v.durationLabel, v.publishedAt].every(field => field == null || typeof field === 'string');
}

// Exactly two selections; tapping a third replaces the oldest pick.
export function pickCompare(selected: string[], videoId: string): string[] {
  if (selected.includes(videoId)) return selected.filter(id => id !== videoId);
  return [...selected.slice(-1), videoId];
}

export function compareLayout(width: number): 'row' | 'column' {
  return width >= 640 ? 'row' : 'column';
}

export function compareHint(v: VideoResult): string {
  const bits = [v.why];
  if (v.tags.length) bits.push(`Labeled in title: ${v.tags.join(', ')}`);
  bits.push(v.trusted ? 'Source is on Humai\u2019s reviewed channel list.' : 'Source not on Humai\u2019s reviewed list.');
  return bits.join(' · ');
}
