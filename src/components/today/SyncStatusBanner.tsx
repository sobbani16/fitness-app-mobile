import React, { useState } from 'react';
import { Share, View } from 'react-native';
import { Action, Card, Copy, Notice } from '../../design/components';
import { Compatibility, diagnosticReport, recentFailures } from '../../services/apiDiagnostics';
import { MealSyncIssue } from '../../services/mealSync';

const LABELS: Record<string, string> = { meals: 'meals', goals: 'targets', health: 'Health Score', energy: 'energy', daily: 'water', weather: 'weather' };

export function syncBannerTitle({ failed, offline, issues, compat }: { failed: string[]; offline: boolean; issues: number; compat: Compatibility }): string | null {
  if (compat === 'update_app') return 'Update Humai to keep syncing';
  if (offline) return 'Offline — showing data saved on this device';
  if (failed.length) return `Couldn’t refresh ${failed.map(k => LABELS[k] ?? k).join(', ')}`;
  if (issues) return `${issues} meal${issues === 1 ? '' : 's'} need${issues === 1 ? 's' : ''} a fix before syncing`;
  return null;
}

/** One compact status for the whole Today screen, with Details and Retry. */
export function SyncStatusBanner({ failed, offline, issues, compat, busy, onRetry, onRetryRejected }: {
  failed: string[]; offline: boolean; issues: MealSyncIssue[]; compat: Compatibility; busy: boolean;
  onRetry: () => void; onRetryRejected: () => void;
}) {
  const [details, setDetails] = useState(false);
  const title = syncBannerTitle({ failed, offline, issues: issues.length, compat });
  if (!title) return null;
  const message = compat === 'update_app' ? 'This version can’t sync with the server. Your entries stay saved on this device.'
    : failed.length ? 'Your entries are saved on this device and will sync automatically.' : 'Your original entries are kept on this device.';
  return <Card>
    <Notice title={title} message={message} />
    {details && <View style={{ gap: 6 }}>
      {issues.map(i => <Copy key={i.id} size="caption">{i.name ?? 'Meal'}: {i.message}</Copy>)}
      {issues.length > 0 && <Action secondary label="Retry corrected meals" disabled={busy} onPress={onRetryRejected} />}
      {compat === 'server_outdated' && <Copy size="caption" tone="muted">The server is running an older version; some data may be unavailable until it updates.</Copy>}
      {recentFailures().slice(0, 3).map(f => <Copy key={`${f.at}${f.endpoint}`} size="caption" tone="muted">
        {f.method} {f.endpoint} · {f.status ?? 'no response'} {f.category}{f.correlationId ? ` · ref ${f.correlationId}` : ''}
      </Copy>)}
      <Action secondary label="Share diagnostics" onPress={() => { void Share.share({ message: diagnosticReport() }).catch(() => {}); }} />
    </View>}
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Action secondary label={details ? 'Hide details' : 'Details'} onPress={() => setDetails(v => !v)} />
      {(failed.length > 0 || compat !== 'update_app') && <Action label={busy ? 'Retrying…' : 'Retry'} disabled={busy} onPress={onRetry} />}
    </View>
  </Card>;
}
