jest.mock('../../detection/detectionService', () => ({ initDetection: jest.fn(), startDetection: jest.fn(), stopDetection: jest.fn(async () => {}), subscribeDetection: jest.fn(), isUsingRealDetection: () => true }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const det = require('../../detection/detectionService');
const { useExerciseDetection } = require('../useExerciseDetection');
it('does not reactivate the camera engine when closed during initialization', async () => {
  let resolve, current, tree;
  det.initDetection.mockImplementation(() => new Promise(r => { resolve = r; }));
  function Harness() { current = useExerciseDetection(); return null; }
  await act(async () => { tree = create(<Harness />); });
  let pending;
  await act(async () => { pending = current.start('squat'); });
  await act(async () => current.stop());
  await act(async () => { resolve(); await pending; });
  expect(det.startDetection).not.toHaveBeenCalled();
  expect(current.status).toBe('stopped');
  await act(async () => tree.unmount());
});
