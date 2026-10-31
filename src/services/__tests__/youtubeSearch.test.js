jest.mock('react-native', () => ({
  Linking: { canOpenURL: jest.fn(), openURL: jest.fn() },
}));

import { Linking } from 'react-native';
import { openYouTubeSearch, youtubeSearchUrl } from '../youtubeSearch';

describe('youtubeSearchUrl', () => {
  it('encodes the query safely', () => {
    expect(youtubeSearchUrl('Barbell Bench Press - Medium Grip')).toBe(
      'https://www.youtube.com/results?search_query=Barbell%20Bench%20Press%20-%20Medium%20Grip');
    expect(youtubeSearchUrl('squat & hinge')).toBe(
      'https://www.youtube.com/results?search_query=squat%20%26%20hinge');
  });

  it('always builds a youtube.com URL', () => {
    expect(youtubeSearchUrl('anything')).toMatch(/^https:\/\/www\.youtube\.com\//);
  });
});

describe('openYouTubeSearch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the encoded URL when a handler exists', async () => {
    Linking.canOpenURL.mockResolvedValue(true);
    Linking.openURL.mockResolvedValue(undefined);
    expect(await openYouTubeSearch('deadlift form')).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.youtube.com/results?search_query=deadlift%20form');
  });

  it('returns false when nothing can open the URL', async () => {
    Linking.canOpenURL.mockResolvedValue(false);
    expect(await openYouTubeSearch('x')).toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('returns false when openURL rejects', async () => {
    Linking.canOpenURL.mockResolvedValue(true);
    Linking.openURL.mockRejectedValue(new Error('no handler'));
    expect(await openYouTubeSearch('x')).toBe(false);
  });

  it('returns false when canOpenURL throws', async () => {
    Linking.canOpenURL.mockRejectedValue(new Error('broken'));
    expect(await openYouTubeSearch('x')).toBe(false);
  });
});
