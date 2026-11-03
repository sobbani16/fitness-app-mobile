import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { AcademyArticle, getArticle } from '../api/academy';
import { Card, Copy, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import EmptyState from '../components/ui-states/EmptyState';

function Section({ title, body, warn }: { title: string; body?: string; warn?: boolean }) {
  const { colors } = useTheme();
  if (!body) return null;
  return (
    <Card>
      <Copy size="caption" tone={warn ? 'danger' : 'muted'} style={{ fontWeight: '700' }}>{title.toUpperCase()}</Copy>
      <Copy style={{ marginTop: 6 }}>{body}</Copy>
    </Card>
  );
}

export default function LearnArticleScreen({ route }: any) {
  const { colors } = useTheme();
  const { slug } = route.params as { slug: string };
  const [a, setA] = useState<AcademyArticle | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getArticle(slug).then(setA).catch(e => setErr(e.response?.data?.error || 'Could not load article.'));
  }, [slug]);

  if (err) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><EmptyState title="Article unavailable" description={err} /></View>;
  if (!a) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /></View>;
  const r = a.revision;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View>
        <Copy size="caption" tone="muted">MYTH VS FACT · {a.category.replace(/_/g, ' ').toUpperCase()}</Copy>
        <Copy size="heading" style={{ fontWeight: '700', marginTop: 4 }}>{r.title}</Copy>
        <Copy tone="muted" style={{ marginTop: 6 }}>“{r.claim}”</Copy>
        <Copy style={{ marginTop: 8, fontWeight: '600' }}>{r.verdict.replace(/_/g, ' ')} — {r.certainty.replace(/_/g, ' ').toLowerCase()} certainty</Copy>
        <Copy style={{ marginTop: 8 }}>{r.shortVerdict}</Copy>
      </View>
      <Section title="What the evidence suggests" body={r.explanation} />
      <Section title="Practical takeaway" body={r.takeaway} />
      <Section title="Who this applies to" body={r.appliesTo} />
      <Section title="Important exceptions" body={r.exceptions} warn />
      <Section title="Uncertainty & conflicting findings" body={r.uncertainty} warn />
      <Card>
        <Copy size="caption" tone="muted" style={{ fontWeight: '700' }}>RESEARCH REFERENCES</Copy>
        {a.sources.map((s, i) => (
          <View key={s.key} style={{ marginTop: 8 }}>
            <Copy style={{ color: (s.url || s.doi) ? colors.primary : colors.text }}
              onPress={() => { const u = s.doi ? `https://doi.org/${s.doi}` : s.url; if (u) Linking.openURL(u); }}>
              {i + 1}. {s.title}
            </Copy>
            <Copy size="caption" tone="muted">{s.journal}{s.year ? `, ${s.year}` : ''}{s.studyType ? ` · ${s.studyType.replace(/_/g, ' ')}` : ''}</Copy>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
