import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, ScrollView, View } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Field, IconAction, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { searchVideos, reportVideo, VideoResult, VideoSort, VideoContext } from '../api/videos';
import { loadFavoriteVideos, toggleFavoriteVideo, loadWatchLater, toggleWatchLater, setPreferredVideo } from '../storage/favoriteVideos';
import { pickCompare } from '../services/videoCompare';

const SORTS: { key: VideoSort; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'most-viewed', label: 'Most viewed' },
  { key: 'newest', label: 'Newest' },
  { key: 'relevance', label: 'Relevance' },
];

function views(v: VideoResult) {
  return v.viewCount == null ? 'Views unavailable' : `${Number(v.viewCount).toLocaleString()} views`;
}

function VideoRow({ v, favorite, later, comparing, picked, onToggleFav, onToggleLater, onOpen, onCompare, onReport }: {
  v: VideoResult; favorite: boolean; later: boolean; comparing: boolean; picked: boolean;
  onToggleFav: () => void; onToggleLater: () => void; onOpen: () => void; onCompare: () => void; onReport: () => void;
}) {
  const { colors } = useTheme();
  return <Card>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {v.thumbnailUrl
        ? <Image source={{ uri: v.thumbnailUrl }} style={{ width: 120, height: 68, borderRadius: 8, backgroundColor: colors.border }} accessibilityLabel={`Thumbnail for ${v.title}`} />
        : <View style={{ width: 120, height: 68, borderRadius: 8, backgroundColor: colors.border }} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Copy numberOfLines={2}>{v.title}</Copy>
        <Copy size="caption" tone="muted">{v.channelTitle}{v.trusted && v.trustedChannelName ? ` · Reviewed source` : ''}</Copy>
        <Copy size="caption" tone="muted">{[v.durationLabel, views(v), v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : null].filter(Boolean).join(' · ')}</Copy>
        {!!v.tags?.length && <Copy size="caption" tone="muted">{v.tags.join(' · ')}</Copy>}
        {!!v.why && <Copy size="caption" tone="muted">Why: {v.why}</Copy>}
      </View>
    </View>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Action label="Watch on YouTube" secondary onPress={onOpen} />
      <IconAction label={favorite ? `Remove saved video: ${v.title}` : `Save video: ${v.title}`} icon={favorite ? '♥' : '♡'} onPress={onToggleFav} />
      <Action secondary label={later ? 'Watch later ✓' : 'Watch later'} onPress={onToggleLater} />
      {comparing && <Action secondary label={picked ? 'Picked ✓' : 'Compare'} selected={picked} onPress={onCompare} />}
      <Action secondary label="Report" onPress={onReport} />
    </View>
  </Card>;
}

export default function VideoSearchScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoSearch'>>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const context: VideoContext = route.params?.context || 'general';
  const exerciseKey = route.params?.exerciseKey;
  const [query, setQuery] = useState(route.params?.query || '');
  const [sort, setSort] = useState<VideoSort>('recommended');
  const [recommended, setRecommended] = useState<VideoResult[]>([]);
  const [explore, setExplore] = useState<VideoResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [watchLater, setWatchLater] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    void loadFavoriteVideos().then(list => setFavorites(new Set(list.map(v => v.videoId))));
    void loadWatchLater().then(list => setWatchLater(new Set(list.map(v => v.videoId))));
  }, []);

  const run = useCallback(async (q: string, s: VideoSort, pageToken?: string) => {
    pageToken ? setMore(true) : setLoading(true);
    setError('');
    try {
      const r = await searchVideos(q, context, s, pageToken);
      if (pageToken) {
        setRecommended(prev => [...prev, ...r.recommended.filter(v => !prev.some(x => x.videoId === v.videoId))]);
        setExplore(prev => [...prev, ...r.explore.filter(v => !prev.some(x => x.videoId === v.videoId))]);
      } else {
        setRecommended(r.recommended); setExplore(r.explore); setSearched(true);
      }
      setNextPageToken(r.nextPageToken);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not search videos. Check your connection and try again.');
    } finally { setLoading(false); setMore(false); }
  }, [context]);

  useEffect(() => { if (query.trim()) void run(query, 'recommended'); }, [run]); // initial auto-search once

  const open = (v: VideoResult) => void Linking.openURL(`https://www.youtube.com/watch?v=${v.videoId}`);
  const fav = async (v: VideoResult) => { const list = await toggleFavoriteVideo(v); setFavorites(new Set(list.map(x => x.videoId))); };
  const later = async (v: VideoResult) => { const list = await toggleWatchLater(v); setWatchLater(new Set(list.map(x => x.videoId))); };
  const report = async (v: VideoResult) => { try { await reportVideo(v.videoId, 'misleading-or-irrelevant'); setError(''); } catch { setError('Could not send the report.'); } };
  const all = [...recommended, ...explore];
  const availableTags = [...new Set(all.flatMap(v => v.tags || []))].slice(0, 8);
  const filtered = (items: VideoResult[]) => tagFilter ? items.filter(v => (v.tags || []).includes(tagFilter)) : items;
  const onCompare = (v: VideoResult) => {
    const next = pickCompare(picked, v.videoId);
    setPicked(next);
    if (next.length === 2) {
      const pair = next.map(id => all.find(x => x.videoId === id)).filter(Boolean) as [VideoResult, VideoResult];
      if (pair.length === 2) { setPicked([]); setCompareMode(false); navigation.navigate('VideoCompare', { videos: pair, exerciseKey }); }
    }
  };

  const renderSection = (title: string, hint: string, items: VideoResult[]) => items.length ? <>
    <Copy size="heading">{title}</Copy>
    <Copy size="caption" tone="muted">{hint}</Copy>
    {items.map(v => <VideoRow key={v.videoId} v={v} favorite={favorites.has(v.videoId)} later={watchLater.has(v.videoId)}
      comparing={compareMode} picked={picked.includes(v.videoId)}
      onToggleFav={() => void fav(v)} onToggleLater={() => void later(v)} onOpen={() => open(v)}
      onCompare={() => onCompare(v)} onReport={() => void report(v)} />)}
  </> : null;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">Video search</Copy>
    <Card>
      <Field label="Search YouTube" value={query} onChangeText={setQuery} onSubmitEditing={() => void run(query, sort)} returnKeyType="search" />
      <Action label="Search" disabled={loading || !query.trim()} onPress={() => void run(query, sort)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SORTS.map(s => <Action secondary key={s.key} label={s.label} selected={sort === s.key} onPress={() => { setSort(s.key); void run(query, s.key); }} />)}
      </View>
    </Card>
    {!!error && <Notice title="Search failed" message={error} error />}
    {loading && <Skeleton label="Searching YouTube" />}
    {searched && !loading && !recommended.length && !explore.length && !error && (
      <Card><Copy tone="muted">No videos found. Try editing the search term.</Copy></Card>
    )}
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Action secondary label={compareMode ? 'Cancel compare' : 'Compare videos'} selected={compareMode}
        onPress={() => { setCompareMode(m => !m); setPicked([]); }} />
      {compareMode && <Copy size="caption" tone="muted">Pick any two videos ({picked.length}/2)</Copy>}
    </View>
    {!!availableTags.length && <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {availableTags.map(t => <Action secondary key={t} label={t} selected={tagFilter === t} onPress={() => setTagFilter(tagFilter === t ? null : t)} />)}
    </View>}
    {renderSection('Recommended by Humai', 'From channels on Humai\u2019s curated source list. Curation is not a medical endorsement.', filtered(recommended))}
    {renderSection('Explore YouTube', 'Ranked by relevance, views, and recency. We can\u2019t verify accuracy — use your judgment.', filtered(explore))}
    {!!nextPageToken && !loading && (
      <Action secondary label={more ? 'Loading…' : 'Load more'} disabled={more} onPress={() => void run(query, sort, nextPageToken)} />
    )}
    <Copy size="caption" tone="muted">Videos open in YouTube. View counts and dates come from YouTube; high views do not mean the content is accurate.</Copy>
  </ScrollView>;
}
