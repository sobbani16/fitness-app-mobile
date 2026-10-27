import { api } from './client';

export interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  viewCount: number | null;
  likeCount: number | null;
  durationSeconds: number | null;
  durationLabel: string | null;
  trusted: boolean;
  trustedChannelName: string | null;
}

export type VideoSort = 'recommended' | 'most-viewed' | 'newest' | 'relevance';
export type VideoContext = 'exercise' | 'recipe' | 'nutrition' | 'education' | 'general';

export interface VideoSearchResponse {
  recommended: VideoResult[];
  explore: VideoResult[];
  nextPageToken: string | null;
  query: string;
}

export function searchVideos(q: string, context: VideoContext = 'general', sort: VideoSort = 'recommended', pageToken?: string): Promise<VideoSearchResponse> {
  return api.get<VideoSearchResponse>('/videos/search', { params: { q, context, sort, ...(pageToken ? { pageToken } : {}) } }).then(r => r.data);
}
