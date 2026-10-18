const React = require('react'), { create, act } = require('react-test-renderer');
const { AccessibilityInfo } = require('react-native');
const { useReducedMotion } = require('../useReducedMotion');
let tree, current, listener, resolve, remove;
function Harness() { current = useReducedMotion(); return null; }
beforeEach(() => {
  remove = jest.fn();
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_name, fn) => { listener = fn; return { remove }; });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => new Promise(done => { resolve = done; }));
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); jest.restoreAllMocks(); });
it('starts without animation, follows OS changes and ignores stale initial preferences', async () => {
  await act(async () => { tree = create(<Harness />); }); expect(current).toBe(true);
  await act(async () => listener(true)); await act(async () => resolve(false)); expect(current).toBe(true);
  await act(async () => listener(false)); expect(current).toBe(false);
  await act(async () => tree.unmount()); expect(remove).toHaveBeenCalled(); tree = null;
});
