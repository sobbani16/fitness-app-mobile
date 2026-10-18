import React from 'react';
import { View } from 'react-native';
import { Action, Copy, Notice } from '../design/components';
import { DashboardCard, useDisplayPreferences } from '../context/DisplayPreferencesContext';
export default function DashboardPreferences() {
  const { cards, loading, busy, error, setCard } = useDisplayPreferences();
  return <View style={{ gap: 12 }}><Copy size="heading">Your Today cards</Copy><Copy tone="muted">Choose the optional cards you want to see. Food totals and quick logging stay available. Choices are saved on this device for your account.</Copy>
    {([['note', 'Daily note'], ['water', 'Water'], ['steps', 'Steps'], ['meals', 'Meal preview']] as [DashboardCard, string][]).map(([key, label]) => <Action key={key} label={`${cards[key] ? '✓ Show' : 'Hidden:'} ${label}`} selected={cards[key]} secondary disabled={loading || busy} onPress={() => void setCard(key, !cards[key])} />)}
    {!!error && <Notice title="Card preferences" message={error} error />}
  </View>;
}
