import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AcademyListItem, FaqHit, getFeatured, listArticles, searchFaq } from '../api/academy';
import { Card, Copy, Action, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import EmptyState from '../components/ui-states/EmptyState';

const VERDICT_COLORS: Record<string, string> = {
  MYTH: '#c0392b', MOSTLY_MYTH: '#e67e22', CONTEXT_DEPENDENT: '#2980b9',
  MOSTLY_SUPPORTED: '#27ae60', SUPPORTED: '#27ae60', INSUFFICIENT_EVIDENCE: '#7f8c8d',
};

export default function LearnScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const [featured, setFeatured] = useState<any>(null);
  const [items, setItems] = useState<AcademyListItem[]>([]);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ faqs: FaqHit[]; articles: { slug: string; title: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [f, list] = await Promise.all([getFeatured(), listArticles()]);
      setFeatured(f); setItems(list);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load the academy.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const search = async (text: string) => {
    setQ(text);
    if (text.trim().length < 3) { setHits(null); return; }
    try { setHits(await searchFaq(text.trim())); } catch { /* keep prior results */ }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={q.trim().length >= 3 ? [] : items}
      keyExtractor={a => a.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          {featured && (
            <Card>
              <Copy size="caption" tone="muted">THIS WEEK'S MYTH VS FACT</Copy>
              <Copy size="title" style={{ fontWeight: '700', marginTop: 4 }}>{featured.revision.title}</Copy>
              <Copy tone="muted" style={{ marginTop: 4 }}>“{featured.revision.claim}”</Copy>
              <Action label="Read the evidence" onPress={() => nav.navigate('LearnArticle', { slug: featured.slug })} />
            </Card>
          )}
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.surface }}
            placeholder="Ask a fitness question…" placeholderTextColor={colors.muted}
            value={q} onChangeText={search}
          />
          {hits && !hits.faqs.length && !hits.articles.length && (
            <EmptyState title="No reviewed answer yet" description="Our editorial team only publishes evidence-backed answers — try a related topic or check back soon." />
          )}
          {hits?.faqs.map(f => (
            <Card key={f.id}><Copy style={{ fontWeight: '600' }}>{f.canonicalQuestion}</Copy><Copy tone="muted" style={{ marginTop: 4 }}>{f.shortAnswer}</Copy></Card>
          ))}
          {hits?.articles.map(a => (
            <Card key={a.slug}><Action label={a.title} onPress={() => nav.navigate('LearnArticle', { slug: a.slug })} secondary /></Card>
          ))}
          {error && <Copy tone="danger">{error}</Copy>}
          {!hits && <Copy size="title" style={{ fontWeight: '600' }}>Archive</Copy>}
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Copy style={{ fontWeight: '600' }}>{item.title}</Copy>
              <Copy tone="muted" size="caption" style={{ marginTop: 2 }}>{item.claim}</Copy>
            </View>
            <Copy size="caption" style={{ color: VERDICT_COLORS[item.verdict] || colors.muted, fontWeight: '700' }}>
              {item.verdict.replace(/_/g, ' ')}
            </Copy>
          </View>
          <Action label="Read" secondary onPress={() => nav.navigate('LearnArticle', { slug: item.slug })} />
        </Card>
      )}
    />
  );
}
