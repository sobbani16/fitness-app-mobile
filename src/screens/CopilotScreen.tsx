import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Copy, ListRow, Notice, Skeleton } from '../design/components';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';
import { useTheme } from '../design/theme';
import {
  getCopilotClients, getCopilotSuggestions,
  CopilotClient, CopilotSuggestion,
} from '../api/copilot';

// Read-only trainer copilot — every suggestion is a rule-based draft that
// requires trainer confirmation. Nothing is applied to a client from here.
export default function CopilotScreen() {
  const { colors } = useTheme();
  const [clients, setClients] = useState<CopilotClient[]>([]);
  const [selected, setSelected] = useState<CopilotClient | null>(null);
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    getCopilotClients()
      .then((r) => { if (live) setClients(r.clients); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []));

  async function open(client: CopilotClient) {
    setSelected(client); setSuggestions([]); setDetailLoading(true);
    try {
      const r = await getCopilotSuggestions(client.clientId);
      setSuggestions(r.suggestions);
    } catch { setSuggestions([]); }
    finally { setDetailLoading(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Copilot</Copy>
      <Copy tone="muted" size="caption">Read-only client summaries and draft suggestions — you confirm anything before it reaches a client.</Copy>
      {loading && <Skeleton label="Loading clients" />}
      {error && <Notice error title="Couldn't load copilot" message="Check your connection and try again." />}
      {!loading && !error && clients.length === 0 && (
        <EmptyState title="No active clients" description="Copilot suggestions appear once you have active client relationships." />
      )}
      {!selected && clients.length > 0 && (
        <Card>
          {clients.map((c) => (
            <ListRow key={c.relationId} title={c.clientName}
              subtitle={`Check-in: ${c.checkInThisWeek === 'missing' ? 'not sent' : c.checkInThisWeek.replace('_', ' ')} · Intake: ${c.intakeStatus}${c.pendingFormChecks ? ` · ${c.pendingFormChecks} form-check${c.pendingFormChecks > 1 ? 's' : ''} waiting` : ''}`}
              onPress={() => void open(c)}>
              <Chip small label="Open" accessibilityLabel={`Open ${c.clientName} suggestions`} />
            </ListRow>
          ))}
        </Card>
      )}
      {selected && (
        <>
          <ListRow title={`← ${selected.clientName}`} subtitle="Back to clients" onPress={() => setSelected(null)} />
          {detailLoading && <Skeleton label="Drafting suggestions" />}
          {!detailLoading && suggestions.length === 0 && (
            <Card><Copy tone="muted">No suggestions right now — nothing in the shared record points to a needed change.</Copy></Card>
          )}
          {suggestions.map((s, i) => (
            <Card key={`${s.kind}-${i}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Chip small label={s.label} accessibilityLabel="AI draft, requires trainer confirmation" />
              </View>
              <Copy style={{ fontWeight: '600' }}>{s.title}</Copy>
              <Copy>{s.detail}</Copy>
              {s.evidence.length > 0 && (
                <Copy size="caption" tone="muted">Based on: {s.evidence.join(' · ')}</Copy>
              )}
            </Card>
          ))}
          <Copy size="caption" tone="muted">Suggestions only use data your client has consented to share. They are drafts — nothing is sent or applied automatically.</Copy>
        </>
      )}
    </ScrollView>
  );
}
