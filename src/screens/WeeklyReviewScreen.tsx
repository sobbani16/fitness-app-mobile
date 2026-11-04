import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Action, Card, Copy, ListRow, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import {
  getWeeklyReview, markWeeklyReviewOpened, setWeeklyReviewOpt,
  ReviewItem, WeeklyHealthReview,
} from '../api/weeklyReview';

function Items({ title, items, icon }: { title: string; items: ReviewItem[]; icon: string }) {
  if (!items.length) return null;
  return (
    <Card>
      <Copy size="heading" style={{ fontWeight: '600' }}>{icon} {title}</Copy>
      {items.map((it, i) => (
        <View key={i} style={{ gap: 2 }}>
          <Copy>{it.text}</Copy>
          <Copy size="caption" tone="muted">Based on: {it.evidence}</Copy>
        </View>
      ))}
    </Card>
  );
}

export default function WeeklyReviewScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { isEnabled } = useFeatureFlags();
  const [review, setReview] = useState<WeeklyHealthReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const academyOn = isEnabled('knowledgeAcademyEnabled');

  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    getWeeklyReview()
      .then((r) => { if (!live) return; setReview(r); void markWeeklyReviewOpened(r.weekOf).catch(() => {}); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []));

  async function toggleOpt() {
    if (!review) return;
    try {
      const r = await setWeeklyReviewOpt(!review.enabled);
      setReview({ ...review, enabled: r.enabled });
    } catch { /* keep current state */ }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Your week in review</Copy>
      {loading && <Skeleton label="Building your weekly review" />}
      {error && <Notice error title="Couldn't load your review" message="Check your connection and try again." />}
      {review && !loading && (
        <>
          <Card>
            <Copy tone="muted" size="caption">Week of {review.weekOf}{review.complete ? '' : ` · ${review.daysElapsed} day${review.daysElapsed === 1 ? '' : 's'} so far`}</Copy>
            <Copy size="heading" style={{ fontWeight: '600' }}>{review.summary}</Copy>
            <Copy size="caption" tone="muted">Data coverage: {review.dataCompleteness}</Copy>
          </Card>

          {review.trainer.present && (
            <Card>
              <Copy size="heading" style={{ fontWeight: '600' }}>Your coach</Copy>
              <Copy>{review.trainer.displayName ?? 'Coach'} — check-in {review.trainer.checkInStatus === 'not_submitted' ? 'not sent this week' : review.trainer.checkInStatus}</Copy>
              {!!review.trainer.trainerReply && <Copy tone="muted">“{review.trainer.trainerReply}”</Copy>}
            </Card>
          )}

          <Items title="What went well" items={review.wentWell} icon="✅" />
          <Items title="What looked harder" items={review.wasDifficult} icon="⛰️" />
          <Items title="Opportunities" items={review.opportunities} icon="💡" />

          <Card>
            <Copy size="heading" style={{ fontWeight: '600' }}>Focus for next week</Copy>
            <Copy>{review.nextWeekFocus}</Copy>
          </Card>

          {academyOn && review.relatedContent.length > 0 && (
            <Card>
              <Copy size="heading" style={{ fontWeight: '600' }}>From the Academy</Copy>
              {review.relatedContent.map((a) => (
                <ListRow key={a.slug} title={a.title} subtitle={a.category}
                  onPress={() => navigation.navigate('LearnArticle', { slug: a.slug })} />
              ))}
            </Card>
          )}

          <Copy size="caption" tone="muted">{review.note}</Copy>
          <Action secondary label={review.enabled ? 'Turn off weekly review' : 'Turn on weekly review'} onPress={() => void toggleOpt()} />
        </>
      )}
    </ScrollView>
  );
}
