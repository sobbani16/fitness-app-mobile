jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import MuscleMap, { MUSCLE_LABELS } from '../MuscleMap';

const render = async el => { let t; await act(async () => { t = create(el); }); return t.root; };
const allText = root => root.findAllByType(Text).map(n => [n.props.children].flat(10).join('')).join('|');

describe('MuscleMap', () => {
  it('marks involved muscles and labels uninvolved regions', async () => {
    const root = await render(<MuscleMap muscles={['chest', 'triceps']} />);
    expect(root.findAllByProps({ accessibilityLabel: 'Chest: involved' }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ accessibilityLabel: 'Triceps: involved' }).length).toBeGreaterThan(0);
    expect(root.findAllByProps({ accessibilityLabel: 'Back: not involved' }).length).toBeGreaterThan(0);
    expect(allText(root)).toContain('Involves: Chest, Triceps');
  });

  it('renders both sides and never claims effort or intensity', async () => {
    const root = await render(<MuscleMap muscles={['quads']} />);
    expect(allText(root)).toContain('Front');
    expect(allText(root)).toContain('Back');
    expect(allText(root)).toContain('not a measure of effort');
  });

  it('exposes a stable label table for every catalog muscle', () => {
    expect(MUSCLE_LABELS['posterior']).toBe('Posterior chain');
    expect(MUSCLE_LABELS['grip']).toBe('Forearms');
  });
});
