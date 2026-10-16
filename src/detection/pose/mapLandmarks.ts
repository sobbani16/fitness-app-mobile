import { KeypointName, PoseFrame } from './types';
const indices: Partial<Record<KeypointName, number>> = { nose:0,leftEye:2,rightEye:5,leftEar:7,rightEar:8,leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,leftWrist:15,rightWrist:16,leftHip:23,rightHip:24,leftKnee:25,rightKnee:26,leftAnkle:27,rightAnkle:28 };
export function mapLandmarks(points: Array<{x:number;y:number;visibility?:number;presence?:number}>): PoseFrame {
  const pose:PoseFrame={};
  for(const [name,index] of Object.entries(indices)) {
    const p=points[index!];
    if(p && Number.isFinite(p.x) && Number.isFinite(p.y))pose[name as KeypointName]={x:p.x,y:p.y,confidence:Math.min(p.visibility??0,p.presence??1)};
  }
  return pose;
}
