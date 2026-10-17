import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Action, Copy, Sheet } from '../design/components';
export default function QuickAdd() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation<any>();
  function go(route: string, params?: object) { setVisible(false); navigation.navigate(route, params); }
  return <><Action label="＋ Add" secondary hint="Open quick logging actions" onPress={() => setVisible(true)} />
    <Sheet visible={visible} onClose={() => setVisible(false)} title="What would you like to log?">
      <Action label="Scan nutrition label" onPress={() => go('LabelScanner', {})} />
      <Action label="Search food" secondary onPress={() => go('FoodEntry', { mode: 'search' })} />
      <Action label="Log a meal" secondary onPress={() => go('LogMeal')} />
      <Action label="Log water" secondary onPress={() => go('Dashboard', { waterRequest: Date.now() })} />
      <Action label="Log exercise" secondary onPress={() => go('LogExercise')} />
      <Action label="Update weight" secondary onPress={() => go('EditProfile')} />
      <Copy tone="muted" size="caption">Weight opens your profile. Food search opens directly; meal logging opens your food choices.</Copy>
    </Sheet></>;
}
