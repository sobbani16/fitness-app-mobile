import React, { useState } from 'react';
import { Image, Linking, ScrollView, useWindowDimensions, View } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { VideoResult } from '../api/videos';
import { compareLayout, compareHint } from '../services/videoCompare';
import { setPreferredVideo, toggleWatchLater } from '../storage/favoriteVideos';

function CompareCard({ v, chosen, onChoose, onLater, onWatch }: {
  v: VideoResult; chosen: boolean; onChoose: () => void; onLater: () => void; onWatch: () => void;
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
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Action label={chosen ? 'Chosen ✓' : 'Choose this video'} onPress={onChoose} />
      <Action secondary label="Save for later" onPress={onLater} />
    </View>
  </Card>;
}

export default function VideoCompareScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoCompare'>>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [a, b] = route.params.videos;
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const exerciseKey = route.params.exerciseKey;

  const choose = async (v: VideoResult) => {
    setChosenId(v.videoId);
    if (exerciseKey) await setPreferredVideo(exerciseKey, { videoId: v.videoId, title: v.title, channelTitle: v.channelTitle });
  };
  const later = async (v: VideoResult) => { await toggleWatchLater(v); setSavedId(v.videoId); };
  const watch = (v: VideoResult) => void Linking.openURL(`https://www.youtube.com/watch?v=${v.videoId}`);

  if (!a || !b) return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}><Notice title="Pick two videos" message="Select exactly two videos to compare." error /></ScrollView>;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">Compare demonstrations</Copy>
    <View style={{ flexDirection: compareLayout(width), gap: 12, alignItems: compareLayout(width) === 'row' ? 'flex-start' : 'stretch' }}>
      <CompareCard v={a} chosen={chosenId === a.videoId} onChoose={() => void choose(a)} onLater={() => void later(a)} onWatch={() => watch(a)} />
      <CompareCard v={b} chosen={chosenId === b.videoId} onChoose={() => void choose(b)} onLater={() => void later(b)} onWatch={() => watch(b)} />
    </View>
    {!!chosenId && <Notice title="Preference saved" message={exerciseKey ? 'This demo will appear on this exercise next time.' : 'Saved as your preferred demonstration.'} />}
    {!!savedId && <Copy size="caption" tone="muted">Added to Watch later.</Copy>}
    <Action secondary label="Back to results" onPress={() => navigation.goBack()} />
  </ScrollView>;
}
