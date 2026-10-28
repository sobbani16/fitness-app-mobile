import { mapLandmarks } from '../mapLandmarks';
describe('native landmark mapping', () => {
  it('maps MediaPipe joints and uses the weaker confidence signal', () => {
    const points = Array.from({ length: 33 }, (_, i) => ({ x: i / 33, y: .5, visibility: .9, presence: .7 }));
    const pose = mapLandmarks(points);
    expect(pose.leftShoulder).toEqual({ x: 11 / 33, y: .5, confidence: .7 });
    expect(pose.rightAnkle?.x).toBe(28 / 33);
  });
  it('does not invent landmarks for absent or invalid data', () => {
    expect(mapLandmarks([])).toEqual({});
    expect(mapLandmarks([{ x: NaN, y: 0 }])).toEqual({});
    // Missing visibility/presence fields default to 1 — they must not zero the keypoint.
    expect(mapLandmarks([{ x: .5, y: .5 }]).nose?.confidence).toBe(1);
  });
});
