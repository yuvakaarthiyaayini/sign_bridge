export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface NormalizedLandmarkFrame {
  timestamp: number;
  leftHand: LandmarkPoint[] | null; // 21 points
  rightHand: LandmarkPoint[] | null; // 21 points
  pose: LandmarkPoint[] | null; // Selected 18 upper body points
  face: LandmarkPoint[] | null; // Selected 20 face points
  featureVector: number[]; // Flattened 258-dimensional normalized feature vector
  motionEnergy: number; // Computed kinetic motion energy
  isRestPose: boolean; // True if hands are in resting/neutral position
}

export interface SignPrediction {
  gloss: string;
  confidence: number;
  category: 'fingerspelling' | 'dynamic' | 'rest' | 'unclear';
  timestamp: number;
  latencyMs: number;
  motionEnergy: number;
  isAmbiguous?: boolean;
}

export interface TranslationResult {
  glosses: string[];
  english: string;
  hindi: string;
  grammarNote: string;
  engine: string;
  timestamp: number;
}

export interface ISLSignDefinition {
  gloss: string;
  type: 'static' | 'dynamic';
  category: 'Alphabet' | 'Number' | 'Greeting' | 'Need/Emergency' | 'Question' | 'General';
  description: string;
  tips: string;
  hindiMeaning: string;
  englishMeaning: string;
}

export interface PipelinePerformance {
  fps: number;
  landmarkLatencyMs: number;
  classifierLatencyMs: number;
  totalLatencyMs: number;
  motionEnergy: number;
  activeLandmarkers: {
    hands: boolean;
    pose: boolean;
    face: boolean;
  };
}

export interface ITtsService {
  speak(text: string, lang?: string): Promise<void>;
  stop(): void;
  isAvailable(): boolean;
  getVoices(): SpeechSynthesisVoice[];
}
