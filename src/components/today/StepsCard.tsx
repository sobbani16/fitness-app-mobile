import React, { useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { Action, Card, Copy, Notice } from '../../design/components';
import { useStepCounter } from '../../hooks/useStepCounter';
import { syncSteps } from '../../api/dailyStats';

function ConnectedSteps({ retry }: { retry: () => void }) {
  const { steps, available, error, loading } = useStepCounter();
  const [syncError, setSyncError] = useState(false);
  useEffect(() => {
    if (!available || steps <= 0) return;
    let live = true;
    const timeout = setTimeout(() => {
      syncSteps(steps).then(() => { if (live) setSyncError(false); }).catch(() => { if (live) setSyncError(true); });
    }, 2000);
    return () => { live = false; clearTimeout(timeout); };
  }, [steps, available]);
  return <><Copy size="heading" style={{ fontWeight: '700' }}>{available && !loading ? steps.toLocaleString() : '—'}</Copy>
    <Copy tone="muted">{loading ? 'Checking motion access…' : available ? 'Steps recorded by this device. Counts may be partial when tracking is inactive.' : 'Step tracking is unavailable on this device or permission is turned off.'}</Copy>
    {error && <><Notice error title="Motion access unavailable" message="You can enable motion permission in device settings. Logging meals still works." />
      <Action secondary label="Open device settings" onPress={() => { void Linking.openSettings().catch(() => {}); }} /></>}
    {!loading && !available && <Action secondary label="Retry motion access" onPress={retry} />}
    {syncError && <Copy tone="danger">Steps shown from this device; server sync is unavailable.</Copy>}
  </>;
}
export default function StepsCard() {
  const [attempt, setAttempt] = useState(0);
  // Auto-connect: the OS motion prompt appears at most once; afterwards reads
  // are silent. Remounting on foreground refreshes the day's historical total.
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') setAttempt(v => v + 1); });
    return () => sub.remove();
  }, []);
  return <Card><Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>Movement</Copy>
    <ConnectedSteps key={attempt} retry={() => setAttempt(value => value + 1)} />
  </Card>;
}
