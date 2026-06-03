// Keypoint names mirror Google ML Kit PoseDetection / MediaPipe Pose.
// Any pose backend (MLKit, MediaPipe Tasks, MoveNet) maps to these so the
// rest of the pipeline stays backend-agnostic.

export type KeypointName =
  | 'nose'
  | 'leftEye' | 'rightEye'
  | 'leftEar' | 'rightEar'
  | 'leftShoulder' | 'rightShoulder'
  | 'leftElbow' | 'rightElbow'
  | 'leftWrist' | 'rightWrist'
  | 'leftHip' | 'rightHip'
  | 'leftKnee' | 'rightKnee'
  | 'leftAnkle' | 'rightAnkle';

export interface Keypoint {
  /** Normalized image coords in [0, 1]. */
  x: number;
  y: number;
  /** Model confidence / visibility in [0, 1]. */
  confidence: number;
}

export type PoseFrame = Partial<Record<KeypointName, Keypoint>>;

export interface PoseDetector {
  /** Async one-time init (load model, etc.). */
  init(): Promise<void>;
  /** Release native resources. */
  release(): Promise<void>;
  /**
   * Frame-processor entry point. Receives a VisionCamera frame (typed as
   * `any` here to avoid pulling the RN type into pure modules) and returns
   * a normalized PoseFrame or null if no person detected.
   *
   * Implementations live in `poseBackends/*`.
   */
  detect(frame: any): PoseFrame | null;
}
