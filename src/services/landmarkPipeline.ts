import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  FaceLandmarker,
} from '@mediapipe/tasks-vision';
import { LandmarkPoint, NormalizedLandmarkFrame } from '../types';

export class LandmarkPipeline {
  private handLandmarker: HandLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private faceLandmarker: FaceLandmarker | null = null;

  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private initError: string | null = null;

  // Previous frame for motion-energy calculation
  private prevFeatureVector: number[] | null = null;
  private lastProcessedTimestamp: number = 0;

  // Track status of sub-models
  public status = {
    handsReady: false,
    poseReady: false,
    faceReady: false,
  };

  /**
   * Initializes the three separate MediaPipe Vision landmarkers as requested.
   * Uses modern Tasks API with CDN wasm assets.
   */
  async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      // Load FilesetResolver for WASM binaries
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // 1. Hand Landmarker (tracks both left & right hands)
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.status.handsReady = true;
      } catch (err) {
        console.warn('GPU hand landmarker init failed, retrying with CPU delegate...', err);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });
        this.status.handsReady = true;
      }

      // 2. Pose Landmarker (tracks upper body silhouette, arms & posture)
      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minPoseDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.status.poseReady = true;
      } catch (err) {
        console.warn('Retrying PoseLandmarker with CPU...', err);
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
        });
        this.status.poseReady = true;
      }

      // 3. Face Landmarker (tracks key facial points for ISL non-manual grammatical markers)
      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: false,
          numFaces: 1,
        });
        this.status.faceReady = true;
      } catch (err) {
        console.warn('Retrying FaceLandmarker with CPU...', err);
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: false,
          numFaces: 1,
        });
        this.status.faceReady = true;
      }

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (error: any) {
      this.initError = error?.message || 'Failed to initialize MediaPipe Vision Tasks';
      console.error('MediaPipe initialization error:', error);
      this.isInitializing = false;
      return false;
    }
  }

  getReadyStatus(): { isReady: boolean; isInitializing: boolean; error: string | null } {
    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      error: this.initError,
    };
  }

  /**
   * Processes a video frame and produces a normalized, fused 258-dimensional feature vector.
   */
  processVideoFrame(
    videoElement: HTMLVideoElement,
    timestampMs: number
  ): NormalizedLandmarkFrame | null {
    if (!this.isReady || videoElement.readyState < 2) {
      return null;
    }

    // Guard monotonic timestamps required by MediaPipe Tasks VIDEO mode
    const now = Math.max(timestampMs, this.lastProcessedTimestamp + 1);
    this.lastProcessedTimestamp = now;

    let leftHandPoints: LandmarkPoint[] | null = null;
    let rightHandPoints: LandmarkPoint[] | null = null;
    let posePoints: LandmarkPoint[] | null = null;
    let facePoints: LandmarkPoint[] | null = null;

    // 1. Extract Hands
    if (this.handLandmarker) {
      try {
        const handResult = this.handLandmarker.detectForVideo(videoElement, now);
        if (handResult && handResult.landmarks.length > 0) {
          handResult.landmarks.forEach((landmarks, index) => {
            const handedness = handResult.handednesses[index]?.[0]?.categoryName;
            const points: LandmarkPoint[] = landmarks.map((lm) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z,
              visibility: 1.0,
            }));

            // MediaPipe mirrors webcams by default
            if (handedness === 'Left') {
              leftHandPoints = points;
            } else {
              rightHandPoints = points;
            }
          });
        }
      } catch (e) {
        // Suppress frame drop errors
      }
    }

    // 2. Extract Upper Pose
    if (this.poseLandmarker) {
      try {
        const poseResult = this.poseLandmarker.detectForVideo(videoElement, now);
        if (poseResult && poseResult.landmarks.length > 0) {
          const rawPose = poseResult.landmarks[0];
          // Select 18 upper body keypoints:
          // 0: nose, 2: left eye, 5: right eye, 7: left ear, 8: right ear
          // 11: left shoulder, 12: right shoulder, 13: left elbow, 14: right elbow
          // 15: left wrist, 16: right wrist, 17: left pinky, 18: right pinky
          // 19: left index, 20: right index, 23: left hip, 24: right hip, 0: mid-hip / sternum approx
          const upperBodyIndices = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24, 0];
          posePoints = upperBodyIndices.map((idx) => {
            const lm = rawPose[idx] || { x: 0, y: 0, z: 0, visibility: 0 };
            return {
              x: lm.x,
              y: lm.y,
              z: lm.z,
              visibility: (lm as any).visibility ?? 1.0,
            };
          });
        }
      } catch (e) {
        // Suppress frame drop errors
      }
    }

    // 3. Extract Face Keypoints
    if (this.faceLandmarker) {
      try {
        const faceResult = this.faceLandmarker.detectForVideo(videoElement, now);
        if (faceResult && faceResult.faceLandmarks.length > 0) {
          const rawFace = faceResult.faceLandmarks[0];
          // 20 selected facial points covering eyebrows, eyes, nose, mouth contour, chin
          // Eyebrows: 70, 107, 300, 336
          // Eyes: 33, 133, 263, 362
          // Nose: 1, 4, 197
          // Lips: 0, 13, 14, 17, 61, 291
          // Jaw/Cheeks: 152, 234, 454
          const faceIndices = [
            70, 107, 300, 336, 33, 133, 263, 362, 1, 4, 197, 0, 13, 14, 17, 61, 291, 152, 234, 454,
          ];
          facePoints = faceIndices.map((idx) => {
            const lm = rawFace[idx] || { x: 0, y: 0, z: 0 };
            return {
              x: lm.x,
              y: lm.y,
              z: lm.z,
              visibility: 1.0,
            };
          });
        }
      } catch (e) {
        // Suppress frame drop errors
      }
    }

    // Build fused 258-dim normalized feature vector
    const featureVector = this.constructNormalizedFeatureVector(
      leftHandPoints,
      rightHandPoints,
      posePoints,
      facePoints
    );

    // Compute kinetic motion energy
    const motionEnergy = this.calculateMotionEnergy(featureVector);
    this.prevFeatureVector = [...featureVector];

    // Determine if hands are in rest pose
    const isRest = this.detectRestPose(leftHandPoints, rightHandPoints, posePoints, motionEnergy);

    return {
      timestamp: now,
      leftHand: leftHandPoints,
      rightHand: rightHandPoints,
      pose: posePoints,
      face: facePoints,
      featureVector,
      motionEnergy,
      isRestPose: isRest,
    };
  }

  /**
   * Normalizes landmarks and packages them into a strict 258-dimensional vector.
   * Left Hand: 21 * 3 = 63
   * Right Hand: 21 * 3 = 63
   * Pose: 18 * 4 = 72
   * Face: 20 * 3 = 60
   * Total = 258
   */
  private constructNormalizedFeatureVector(
    leftHand: LandmarkPoint[] | null,
    rightHand: LandmarkPoint[] | null,
    pose: LandmarkPoint[] | null,
    face: LandmarkPoint[] | null
  ): number[] {
    const vector = new Array(258).fill(0);

    // 1. Normalize Left Hand (indices 0..62)
    if (leftHand && leftHand.length === 21) {
      const wrist = leftHand[0];
      const middleKnuckle = leftHand[9];
      const scale =
        Math.hypot(middleKnuckle.x - wrist.x, middleKnuckle.y - wrist.y, middleKnuckle.z - wrist.z) || 1;

      for (let i = 0; i < 21; i++) {
        const pt = leftHand[i];
        vector[i * 3 + 0] = (pt.x - wrist.x) / scale;
        vector[i * 3 + 1] = (pt.y - wrist.y) / scale;
        vector[i * 3 + 2] = (pt.z - wrist.z) / scale;
      }
    }

    // 2. Normalize Right Hand (indices 63..125)
    if (rightHand && rightHand.length === 21) {
      const wrist = rightHand[0];
      const middleKnuckle = rightHand[9];
      const scale =
        Math.hypot(middleKnuckle.x - wrist.x, middleKnuckle.y - wrist.y, middleKnuckle.z - wrist.z) || 1;

      for (let i = 0; i < 21; i++) {
        const pt = rightHand[i];
        vector[63 + i * 3 + 0] = (pt.x - wrist.x) / scale;
        vector[63 + i * 3 + 1] = (pt.y - wrist.y) / scale;
        vector[63 + i * 3 + 2] = (pt.z - wrist.z) / scale;
      }
    }

    // 3. Normalize Upper Pose (indices 126..197)
    if (pose && pose.length === 18) {
      // Pose reference: Mid-point between shoulders (index 5: left shoulder, 6: right shoulder)
      const leftSh = pose[5] || { x: 0.4, y: 0.4, z: 0 };
      const rightSh = pose[6] || { x: 0.6, y: 0.4, z: 0 };
      const midX = (leftSh.x + rightSh.x) / 2;
      const midY = (leftSh.y + rightSh.y) / 2;
      const midZ = (leftSh.z + rightSh.z) / 2;
      const shoulderSpan = Math.hypot(rightSh.x - leftSh.x, rightSh.y - leftSh.y) || 1;

      for (let i = 0; i < 18; i++) {
        const pt = pose[i];
        vector[126 + i * 4 + 0] = (pt.x - midX) / shoulderSpan;
        vector[126 + i * 4 + 1] = (pt.y - midY) / shoulderSpan;
        vector[126 + i * 4 + 2] = (pt.z - midZ) / shoulderSpan;
        vector[126 + i * 4 + 3] = pt.visibility ?? 1.0;
      }
    }

    // 4. Normalize Face (indices 198..257)
    if (face && face.length === 20) {
      // Nose tip is index 8 (landmark 1)
      const nose = face[8] || { x: 0.5, y: 0.3, z: 0 };
      for (let i = 0; i < 20; i++) {
        const pt = face[i];
        vector[198 + i * 3 + 0] = pt.x - nose.x;
        vector[198 + i * 3 + 1] = pt.y - nose.y;
        vector[198 + i * 3 + 2] = pt.z - nose.z;
      }
    }

    return vector;
  }

  /**
   * Computes frame-to-frame kinetic motion energy across wrist, elbow and fingers.
   */
  private calculateMotionEnergy(currentVector: number[]): number {
    if (!this.prevFeatureVector) return 0;

    let sumSquaredDiff = 0;
    let count = 0;

    // Focus on hand landmarks (0..125) and wrist/arm pose (126..197)
    for (let i = 0; i < 126; i += 3) {
      const dx = currentVector[i] - this.prevFeatureVector[i];
      const dy = currentVector[i + 1] - this.prevFeatureVector[i + 1];
      const dz = currentVector[i + 2] - this.prevFeatureVector[i + 2];
      sumSquaredDiff += dx * dx + dy * dy + dz * dz;
      count++;
    }

    return count > 0 ? Math.sqrt(sumSquaredDiff / count) : 0;
  }

  /**
   * Rest-pose detector: Identifies when signer hands are resting down or inactive.
   */
  private detectRestPose(
    leftHand: LandmarkPoint[] | null,
    rightHand: LandmarkPoint[] | null,
    pose: LandmarkPoint[] | null,
    motionEnergy: number
  ): boolean {
    // If no hands detected, signer is in rest/non-signing state
    if (!leftHand && !rightHand) return true;

    // If wrists are below chest / hips or motion energy is very low
    if (pose && pose.length >= 12) {
      const leftWrist = pose[9]; // index 9 corresponds to left wrist in 18-pt upper body
      const rightWrist = pose[10]; // index 10 corresponds to right wrist
      const leftHip = pose[15];
      const rightHip = pose[16];

      const handsDown =
        (leftWrist.y > (leftHip.y - 0.05) && rightWrist.y > (rightHip.y - 0.05)) ||
        (leftWrist.y > 0.85 && rightWrist.y > 0.85);

      if (handsDown && motionEnergy < 0.03) {
        return true;
      }
    }

    return false;
  }
}

// Global Singleton for easy pipeline sharing
export const landmarkPipeline = new LandmarkPipeline();
