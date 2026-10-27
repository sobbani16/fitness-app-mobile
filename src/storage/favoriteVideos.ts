import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountKey } from './session';
import { VideoResult } from '../api/videos';

const KEY = () => accountKey('favoriteVideos');
const LATER_KEY = () => accountKey('watchLaterVideos');
const PREFERRED_KEY = () => accountKey('preferredVideos');

export async function loadFavoriteVideos(): Promise<VideoResult[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function toggleFavoriteVideo(video: VideoResult): Promise<VideoResult[]> {
  const list = await loadFavoriteVideos();
  const exists = list.some(v => v.videoId === video.videoId);
  const next = exists ? list.filter(v => v.videoId !== video.videoId) : [{ ...video }, ...list].slice(0, 100);
  await AsyncStorage.setItem(KEY(), JSON.stringify(next));
  return next;
}

export async function loadWatchLater(): Promise<VideoResult[]> {
  try {
    const raw = await AsyncStorage.getItem(LATER_KEY());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function toggleWatchLater(video: VideoResult): Promise<VideoResult[]> {
  const list = await loadWatchLater();
  const exists = list.some(v => v.videoId === video.videoId);
  const next = exists ? list.filter(v => v.videoId !== video.videoId) : [{ ...video }, ...list].slice(0, 100);
  await AsyncStorage.setItem(LATER_KEY(), JSON.stringify(next));
  return next;
}

// Preferred demonstration per exercise (e.g. 'bench-press' -> videoId+meta).
export type PreferredMap = Record<string, { videoId: string; title: string; channelTitle: string }>;

export async function loadPreferredVideos(): Promise<PreferredMap> {
  try {
    const raw = await AsyncStorage.getItem(PREFERRED_KEY());
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function setPreferredVideo(exerciseKey: string, video: { videoId: string; title: string; channelTitle: string } | null): Promise<PreferredMap> {
  const map = await loadPreferredVideos();
  if (video) map[exerciseKey] = video; else delete map[exerciseKey];
  await AsyncStorage.setItem(PREFERRED_KEY(), JSON.stringify(map));
  return map;
}
