import { pickCompare, compareLayout, compareHint } from '../videoCompare';
import { VideoResult } from '../../api/videos';

const v = (id: string, over = {}): VideoResult => ({
  videoId: id, title: `V${id}`, channelTitle: 'C', channelId: 'UC', publishedAt: '2026-01-01',
  thumbnailUrl: null, viewCount: 100, likeCount: null, durationSeconds: 60, durationLabel: '1:00',
  trusted: false, trustedChannelName: null, tags: [], description: '', why: 'Matched your search', ...over,
});

it('selects exactly two videos, third replaces oldest', () => {
  expect(pickCompare([], 'a')).toEqual(['a']);
  expect(pickCompare(['a'], 'b')).toEqual(['a', 'b']);
  expect(pickCompare(['a', 'b'], 'c')).toEqual(['b', 'c']);
  expect(pickCompare(['a', 'b'], 'a')).toEqual(['b']); // toggling off
});
it('stacks on phones, splits on large screens', () => {
  expect(compareLayout(375)).toBe('column');
  expect(compareLayout(800)).toBe('row');
});
it('explains without inventing review status', () => {
  expect(compareHint(v('x'))).toContain('not on Humai');
  expect(compareHint(v('x', { trusted: true, tags: ['dumbbell'] }))).toContain('reviewed channel list');
  expect(compareHint(v('x', { trusted: true, tags: ['dumbbell'] }))).toContain('dumbbell');
});
