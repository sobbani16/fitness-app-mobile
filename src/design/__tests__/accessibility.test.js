jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
const React = require('react'), { create, act } = require('react-test-renderer');
const { View, Modal, Text } = require('react-native');
const { Sheet, Action, Progress } = require('../components');
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
