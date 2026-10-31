import { Linking } from 'react-native';

// External YouTube search — opens results in the YouTube app/browser.
// By design only the exercise name is sent; never user, health, or workout data.
const YOUTUBE_SEARCH = 'https://www.youtube.com/results?search_query=';

export const youtubeSearchUrl = (query: string) =>
  `${YOUTUBE_SEARCH}${encodeURIComponent(query.trim())}`;

// Returns false when no app/browser can open the URL (or openURL rejects) so
// callers can surface their own message — never throws on the UI path.
export const openYouTubeSearch = async (query: string): Promise<boolean> => {
  const url = youtubeSearchUrl(query);
  if (!/^https:\/\/(www\.)?youtube\.com\//.test(url)) return false;
  try {
    if (!(await Linking.canOpenURL(url))) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};
