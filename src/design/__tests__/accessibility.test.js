jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
const React = require('react'), { create, act } = require('react-test-renderer');
const { View, Modal, Text, StyleSheet, ScrollView } = require('react-native');
const { Sheet, Action, Progress, Segmented, IconAction } = require('../components');
const { ThemeProvider } = require('../theme');
const Storage = require('@react-native-async-storage/async-storage');
let tree;
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
it('exposes modal escape, Android back and an accessible heading without animation', async () => {
  const close = jest.fn();
  await act(async () => { tree = create(<Sheet visible title="Quick logging" onClose={close}><Action label="Log food" onPress={() => {}} /></Sheet>); });
  const modal = tree.root.findByType(Modal); expect(modal.props.animationType).toBe('none');
  expect(tree.root.findAllByType(Text).some(n => n.props.accessibilityRole === 'header' && n.props.children === 'Quick logging')).toBe(true);
  modal.props.onRequestClose(); tree.root.findAllByType(View).find(n => n.props.accessibilityViewIsModal).props.onAccessibilityEscape();
  expect(close).toHaveBeenCalledTimes(2);
});
it('announces unknown progress differently from an explicit zero', async () => {
  await act(async () => { tree = create(<><Progress label="Unknown" value={null} target={100} /><Progress label="Zero" value={0} target={100} /></>); });
  const bars = tree.root.findAllByType(View).filter(n => n.props.accessibilityRole === 'progressbar');
  expect(bars[0].props.accessibilityValue.text).toBe('Not available'); expect(bars[1].props.accessibilityValue.now).toBe(0);
});

it.each(['light', 'dark'])('makes selected controls distinct without changing dimensions in %s', async theme => {
  Storage.getItem.mockResolvedValueOnce(theme);
  await act(async () => { tree = create(<ThemeProvider>
    <Action label="Recent" secondary selected={false} onPress={() => {}} />
    <Action label="Favorites" secondary selected onPress={() => {}} />
    <Segmented label="Appearance" value="light" options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={() => {}} />
  </ThemeProvider>); });
  const button = label => tree.root.findAllByProps({ accessibilityLabel: label }).find(node => node.props.style);
  const style = node => typeof node.props.style === 'function' ? node.props.style({ pressed: false }) : StyleSheet.flatten(node.props.style);
  const plain = style(button('Recent')), selected = style(button('Favorites'));
  expect(selected.backgroundColor).not.toBe(plain.backgroundColor);
  expect(selected.borderColor).not.toBe(plain.borderColor);
  for (const key of ['minHeight', 'padding', 'borderWidth']) expect(selected[key]).toBe(plain[key]);
  expect(button('Favorites').props.accessibilityState.selected).toBe(true);
  expect(button('Appearance: Light').props.accessibilityState.checked).toBe(true);
  expect(style(button('Appearance: Light')).minHeight).toBeGreaterThanOrEqual(48);
});

it('retains scroll sizing when the caller supplies a background style', async () => {
  const KeyboardAwareScrollView = require('../../components/KeyboardAwareScrollView').default;
  await act(async () => { tree = create(<KeyboardAwareScrollView style={{ backgroundColor: 'white' }}><Text>Food</Text></KeyboardAwareScrollView>); });
  expect(StyleSheet.flatten(tree.root.findByType(ScrollView).props.style)).toMatchObject({ flex: 1, backgroundColor: 'white' });
});

it('does not let an icon action also activate its containing food row', async () => {
  const favorite = jest.fn(), stopPropagation = jest.fn();
  await act(async () => { tree = create(<IconAction icon="♥" label="Favorite oats" onPress={favorite} />); });
  tree.root.findAllByProps({ accessibilityLabel: 'Favorite oats' })[0].props.onPress({ stopPropagation });
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(favorite).toHaveBeenCalledTimes(1);
});
