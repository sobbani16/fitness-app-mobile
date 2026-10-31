import React, { useRef, useState } from 'react';
import { Image, Linking, ScrollView, useWindowDimensions, View } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { VideoResult } from '../api/videos';
import { compareLayout, isComparableVideo } from '../services/videoCompare';
import { setPreferredVideo, toggleWatchLater } from '../storage/favoriteVideos';
import { backOrFallback } from '../navigation/back';

function CompareCard({ v, chosen, busy, onChoose, onLater, onWatch }: {
  v: VideoResult; chosen: boolean; busy: boolean; onChoose: () => void; onLater: () => void; onWatch: () => void;
}) {
  const { colors } = useTheme();
  return <Card style={{ flex: 1 }}>
    {v.thumbnailUrl
      ? <Image source={{ uri: v.thumbnailUrl }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: colors.border }} accessibilityLabel={`Thumbnail for ${v.title}`} />
      : <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: colors.border }} />}
    <Copy>{v.title}</Copy>
    <Copy size="caption" tone="muted">{v.channelTitle}</Copy>
    <Copy size="caption" tone="muted">{[v.durationLabel, v.viewCount == null ? 'Views unavailable' : `${v.viewCount.toLocaleString()} views`, v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : null].filter(Boolean).join(' · ')}</Copy>
    <Copy size="caption" tone="muted">{v.trusted ? 'Reviewed source (Humai channel list)' : 'Not a reviewed source'}</Copy>
    {!!v.tags.length && <Copy size="caption" tone="muted">Labels from title: {v.tags.join(', ')}</Copy>}
    <Copy size="caption">Why recommended: {v.why}</Copy>
    {!!v.description && <Copy size="caption" tone="muted" numberOfLines={3}>{v.description}</Copy>}
    <Copy size="caption" tone="muted">Views are not proof of accuracy or safe technique.</Copy>
    <Action label="Watch on YouTube" secondary onPress={onWatch} />
    <View style={{ gap: 8 }}>
      <Action label={chosen ? 'Chosen ✓' : 'Choose this video'} disabled={busy} onPress={onChoose} />
      <Action secondary label="Save for later" disabled={busy} onPress={onLater} />
    </View>
  </Card>;
}

export default function VideoCompareScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoCompare'>>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const videos = route.params?.videos;
  const valid = Array.isArray(videos) && videos.length === 2 && videos.every(isComparableVideo);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const exerciseKey = typeof route.params?.exerciseKey === 'string' ? route.params.exerciseKey : undefined;
  const back = () => backOrFallback(navigation, 'VideoSearch');
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); }
    catch { setError('Could not complete this action. Your selection is unchanged; please retry.'); }
    finally { lock.current = false; setBusy(false); }
  };

  const choose = (v: VideoResult) => run(async () => {
    if (exerciseKey) await setPreferredVideo(exerciseKey, { videoId: v.videoId, title: v.title, channelTitle: v.channelTitle });
    setChosenId(v.videoId);
  });
  const later = (v: VideoResult) => run(async () => {
    const list = await toggleWatchLater(v);
    setSavedMessage(list.some(item => item.videoId === v.videoId) ? 'Added to Watch later.' : 'Removed from Watch later.');
  });
  const watch = (v: VideoResult) => void Linking.openURL(`https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId)}`)
    .catch(() => setError('Could not open YouTube. Please try again.'));

  if (!valid) return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
    <Notice title="Pick two videos" message="Open video search and select two results to compare." error /><Action label="Back to results" onPress={back} />
  </ScrollView>;
  const [a, b] = videos;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">Compare demonstrations</Copy>
    <View style={{ flexDirection: compareLayout(width), gap: 12, alignItems: compareLayout(width) === 'row' ? 'flex-start' : 'stretch' }}>
      <CompareCard v={a} busy={busy} chosen={chosenId === a.videoId} onChoose={() => void choose(a)} onLater={() => void later(a)} onWatch={() => watch(a)} />
      <CompareCard v={b} busy={busy} chosen={chosenId === b.videoId} onChoose={() => void choose(b)} onLater={() => void later(b)} onWatch={() => watch(b)} />
    </View>
    {!!chosenId && <Notice title={exerciseKey ? 'Preference saved' : 'Video selected'} message={exerciseKey ? 'Saved as your preferred demonstration for this exercise.' : 'Selected for this comparison only. Use Save for later to keep it.'} />}
    {!!savedMessage && <Copy size="caption" tone="muted">{savedMessage}</Copy>}
    {!!error && <Notice error title="Please try again" message={error} />}
    <Action secondary label="Back to results" onPress={back} />
  </ScrollView>;
}
