import { VideoResult } from '../api/videos';

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
