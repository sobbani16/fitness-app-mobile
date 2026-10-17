jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const React = require('react');
const { create, act } = require('react-test-renderer');
const Storage = require('@react-native-async-storage/async-storage');
const { ThemeProvider, useTheme, light, dark } = require('../theme');
let current, tree;
function Harness() { current = useTheme(); return null; }
afterEach(async () => { if (tree) await act(async () => tree.unmount()); jest.restoreAllMocks(); });
it('loads device preference, persists changes, and supports returning to system', async () => {
  Storage.getItem.mockResolvedValueOnce('dark');
  await act(async () => { tree = create(<ThemeProvider><Harness /></ThemeProvider>); });
  expect(current.isDark).toBe(true);
  await act(async () => current.setPreference('light'));
  expect(current.colors).toEqual(light);
  expect(Storage.setItem).toHaveBeenLastCalledWith('humai.appearance.v1', 'light');
  await act(async () => current.setPreference('system'));
  expect(current.preference).toBe('system');
});
it('does not overwrite a user choice with late storage hydration and reports save failures', async () => {
  let resolve;
  Storage.getItem.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await act(async () => { tree = create(<ThemeProvider><Harness /></ThemeProvider>); });
  Storage.setItem.mockRejectedValueOnce(new Error('disk'));
  await act(async () => current.setPreference('dark'));
  await act(async () => resolve('light'));
  expect(current.isDark).toBe(true);
  expect(current.storageError).toBe(true);
});
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
it.each([['light', light], ['dark', dark]])('%s normal text color pairs meet 4.5:1 contrast', (_name, colors) => {
  for (const [foreground, background] of [['text', 'surface'], ['muted', 'surface'], ['text', 'accent'], ['danger', 'surface'], ['onPrimary', 'primary'], ['text', 'background']]) {
    const a = luminance(colors[foreground]), b = luminance(colors[background]);
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
