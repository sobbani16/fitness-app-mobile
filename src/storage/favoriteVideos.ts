import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountKey } from './session';
import { VideoResult } from '../api/videos';

const KEY = () => accountKey('favoriteVideos');

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
