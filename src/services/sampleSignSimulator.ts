import { NormalizedLandmarkFrame, LandmarkPoint } from '../types';

export interface SampleSignClip {
  id: string;
  name: string;
  gloss: string;
  category: 'Alphabet' | 'Dynamic' | 'Phrase';
  description: string;
  frameCount: number;
  expectedSentenceEn: string;
  expectedSentenceHi: string;
  frames: NormalizedLandmarkFrame[];
}

export class SampleSignSimulator {
  private clips: Map<string, SampleSignClip> = new Map();

  constructor() {
    this.generateClips();
  }

  getClips(): SampleSignClip[] {
    return Array.from(this.clips.values());
  }

  getClip(id: string): SampleSignClip | undefined {
    return this.clips.get(id);
  }

  private generateClips() {
    // 1. Clip: NAMASTE (Greeting)
    this.clips.set('namaste', {
      id: 'namaste',
      name: 'Namaste (नमस्ते)',
      gloss: 'NAMASTE',
      category: 'Dynamic',
      description: 'Hands moving to center chest with palms pressed together upright',
      frameCount: 30,
      expectedSentenceEn: 'Namaste! Warm greetings.',
      expectedSentenceHi: 'नमस्ते! प्रणाम।',
      frames: this.createNamasteTrajectory(30),
    });

    // 2. Clip: WATER (Drinking gesture)
    this.clips.set('water', {
      id: 'water',
      name: 'Water (पानी)',
      gloss: 'WATER',
      category: 'Dynamic',
      description: 'Hand moving to mouth in drinking motion',
      frameCount: 25,
      expectedSentenceEn: 'I need drinking water, please.',
      expectedSentenceHi: 'मुझे पीने के लिए पानी चाहिए।',
      frames: this.createWaterTrajectory(25),
    });

    // 3. Clip: HELP (One hand lifting the other)
    this.clips.set('help', {
      id: 'help',
      name: 'Help (मदद)',
      gloss: 'HELP',
      category: 'Dynamic',
      description: 'Closed fist resting on flat palm lifting upward together',
      frameCount: 28,
      expectedSentenceEn: 'Please help me.',
      expectedSentenceHi: 'कृपया मेरी मदद करें।',
      frames: this.createHelpTrajectory(28),
    });

    // 4. Clip: WHERE (Question palms wide)
    this.clips.set('where', {
      id: 'where',
      name: 'Where (कहाँ)',
      gloss: 'WHERE',
      category: 'Dynamic',
      description: 'Both hands palms up moving side to side in location inquiry',
      frameCount: 26,
      expectedSentenceEn: 'Where is the place?',
      expectedSentenceHi: 'स्थान कहाँ है?',
      frames: this.createWhereTrajectory(26),
    });

    // 5. Clip: THANK YOU
    this.clips.set('thankyou', {
      id: 'thankyou',
      name: 'Thank You (धन्यवाद)',
      gloss: 'THANK YOU',
      category: 'Dynamic',
      description: 'Hand from chin/lips moving forward towards viewer',
      frameCount: 25,
      expectedSentenceEn: 'Thank you very much.',
      expectedSentenceHi: 'आपका बहुत-बहुत धन्यवाद।',
      frames: this.createThankYouTrajectory(25),
    });

    // 6. Clip: Fingerspelling 'A'
    this.clips.set('letter-a', {
      id: 'letter-a',
      name: 'Fingerspelling: A',
      gloss: 'A',
      category: 'Alphabet',
      description: 'Closed fist with upright thumb beside index',
      frameCount: 20,
      expectedSentenceEn: 'A',
      expectedSentenceHi: 'A',
      frames: this.createFingerspellFrame('A', 20),
    });

    // 7. Clip: Fingerspelling 'B'
    this.clips.set('letter-b', {
      id: 'letter-b',
      name: 'Fingerspelling: B',
      gloss: 'B',
      category: 'Alphabet',
      description: 'Four upright extended fingers with thumb tucked across palm',
      frameCount: 20,
      expectedSentenceEn: 'B',
      expectedSentenceHi: 'B',
      frames: this.createFingerspellFrame('B', 20),
    });

    // 8. Clip: Fingerspelling 'C'
    this.clips.set('letter-c', {
      id: 'letter-c',
      name: 'Fingerspelling: C',
      gloss: 'C',
      category: 'Alphabet',
      description: 'Curved C-handshape with curved fingers and thumb',
      frameCount: 20,
      expectedSentenceEn: 'C',
      expectedSentenceHi: 'C',
      frames: this.createFingerspellFrame('C', 20),
    });
  }

  private createNamasteTrajectory(frameCount: number): NormalizedLandmarkFrame[] {
    const frames: NormalizedLandmarkFrame[] = [];
    for (let t = 0; t < frameCount; t++) {
      const progress = t / frameCount;
      const separation = 0.35 * (1 - progress) + 0.08 * progress;
      const centerY = 0.65 - 0.12 * Math.sin(progress * Math.PI);

      const leftHand = this.createMockHand(0.5 - separation, centerY, true);
      const rightHand = this.createMockHand(0.5 + separation, centerY, false);
      const pose = this.createMockPose(0.5, 0.4);
      const face = this.createMockFace(0.5, 0.25);

      frames.push({
        timestamp: t * 33,
        leftHand,
        rightHand,
        pose,
        face,
        featureVector: new Array(258).fill(0),
        motionEnergy: 0.06 * (1 - progress * 0.5),
        isRestPose: false,
      });
    }
    return frames;
  }

  private createWaterTrajectory(frameCount: number): NormalizedLandmarkFrame[] {
    const frames: NormalizedLandmarkFrame[] = [];
    for (let t = 0; t < frameCount; t++) {
      const p = t / frameCount;
      const handY = 0.6 - 0.28 * Math.sin(p * Math.PI);
      const handX = 0.52 + 0.05 * Math.cos(p * Math.PI);

      const rightHand = this.createMockHand(handX, handY, false);
      const pose = this.createMockPose(0.5, 0.4);
      const face = this.createMockFace(0.5, 0.25);

      frames.push({
        timestamp: t * 33,
        leftHand: null,
        rightHand,
        pose,
        face,
        featureVector: new Array(258).fill(0),
        motionEnergy: 0.07 * Math.sin(p * Math.PI),
        isRestPose: false,
      });
    }
    return frames;
  }

  private createHelpTrajectory(frameCount: number): NormalizedLandmarkFrame[] {
    const frames: NormalizedLandmarkFrame[] = [];
    for (let t = 0; t < frameCount; t++) {
      const p = t / frameCount;
      const liftY = 0.65 - 0.18 * p;

      const leftHand = this.createMockHand(0.48, liftY + 0.03, true);
      const rightHand = this.createMockHand(0.52, liftY, false);
      const pose = this.createMockPose(0.5, 0.4);
      const face = this.createMockFace(0.5, 0.25);

      frames.push({
        timestamp: t * 33,
        leftHand,
        rightHand,
        pose,
        face,
        featureVector: new Array(258).fill(0),
        motionEnergy: 0.08,
        isRestPose: false,
      });
    }
    return frames;
  }

  private createWhereTrajectory(frameCount: number): NormalizedLandmarkFrame[] {
    const frames: NormalizedLandmarkFrame[] = [];
    for (let t = 0; t < frameCount; t++) {
      const p = t / frameCount;
      const wiggle = Math.sin(p * Math.PI * 3) * 0.04;

      const leftHand = this.createMockHand(0.25 + wiggle, 0.55, true);
      const rightHand = this.createMockHand(0.75 - wiggle, 0.55, false);
      const pose = this.createMockPose(0.5, 0.4);
      const face = this.createMockFace(0.5, 0.25);

      frames.push({
        timestamp: t * 33,
        leftHand,
        rightHand,
        pose,
        face,
        featureVector: new Array(258).fill(0),
        motionEnergy: 0.06,
        isRestPose: false,
      });
    }
    return frames;
  }

  private createThankYouTrajectory(frameCount: number): NormalizedLandmarkFrame[] {
    const frames: NormalizedLandmarkFrame[] = [];
    for (let t = 0; t < frameCount; t++) {
      const p = t / frameCount;
      const handY = 0.35 + 0.22 * p; // Moves from chin (0.35) down to chest (0.57)

      const rightHand = this.createMockHand(0.5, handY, false);
      const pose = this.createMockPose(0.5, 0.4);
      const face = this.createMockFace(0.5, 0.25);

      frames.push({
        timestamp: t * 33,
        leftHand: null,
        rightHand,
        pose,
        face,
        featureVector: new Array(258).fill(0),
        motionEnergy: 0.08 * (1 - p * 0.3),
        isRestPose: false,
      });
    }
    return frames;
  }

  private createFingerspellFrame(letter: string, frameCount: number): NormalizedLandmarkFrame[] {
    const frames: NormalizedLandmarkFrame[] = [];
    for (let t = 0; t < frameCount; t++) {
      const rightHand = this.createMockFingerspellHand(letter);
      const pose = this.createMockPose(0.5, 0.4);
      const face = this.createMockFace(0.5, 0.25);

      frames.push({
        timestamp: t * 33,
        leftHand: null,
        rightHand,
        pose,
        face,
        featureVector: new Array(258).fill(0),
        motionEnergy: 0.01,
        isRestPose: false,
      });
    }
    return frames;
  }

  private createMockHand(x: number, y: number, isLeft: boolean): LandmarkPoint[] {
    const pts: LandmarkPoint[] = [];
    const scale = 0.08;
    // 21 keypoints
    // 0: wrist
    pts.push({ x, y, z: 0 });
    // Thumb: 1, 2, 3, 4
    for (let i = 1; i <= 4; i++) {
      pts.push({ x: x + (isLeft ? -1 : 1) * (i * 0.015), y: y - i * 0.01, z: 0 });
    }
    // Index: 5, 6, 7, 8
    for (let i = 1; i <= 4; i++) {
      pts.push({ x: x + (isLeft ? -1 : 1) * 0.01, y: y - i * 0.02, z: 0 });
    }
    // Middle: 9, 10, 11, 12
    for (let i = 1; i <= 4; i++) {
      pts.push({ x, y: y - i * 0.022, z: 0 });
    }
    // Ring: 13, 14, 15, 16
    for (let i = 1; i <= 4; i++) {
      pts.push({ x: x - (isLeft ? -1 : 1) * 0.01, y: y - i * 0.02, z: 0 });
    }
    // Pinky: 17, 18, 19, 20
    for (let i = 1; i <= 4; i++) {
      pts.push({ x: x - (isLeft ? -1 : 1) * 0.02, y: y - i * 0.018, z: 0 });
    }
    return pts;
  }

  private createMockFingerspellHand(letter: string): LandmarkPoint[] {
    const pts: LandmarkPoint[] = [];
    const x = 0.55;
    const y = 0.5;

    // Wrist
    pts.push({ x, y, z: 0 });

    if (letter === 'A') {
      // Fist with upright thumb
      pts.push({ x: x + 0.03, y: y - 0.03, z: 0 });
      pts.push({ x: x + 0.04, y: y - 0.06, z: 0 });
      pts.push({ x: x + 0.04, y: y - 0.09, z: 0 });
      pts.push({ x: x + 0.04, y: y - 0.12, z: 0 }); // Thumb up
      // Curled fingers (tips closer to palm)
      for (let f = 1; f <= 4; f++) {
        for (let j = 1; j <= 4; j++) {
          pts.push({ x: x + (f - 2.5) * 0.02, y: y - (j < 3 ? j * 0.02 : 0.03), z: 0 });
        }
      }
    } else if (letter === 'B') {
      // 4 fingers straight up, thumb folded
      pts.push({ x: x + 0.01, y: y - 0.02, z: 0 });
      pts.push({ x: x + 0.015, y: y - 0.03, z: 0 });
      pts.push({ x: x + 0.01, y: y - 0.03, z: 0 });
      pts.push({ x: x + 0.005, y: y - 0.03, z: 0 });
      // 4 straight upright fingers
      for (let f = 1; f <= 4; f++) {
        for (let j = 1; j <= 4; j++) {
          pts.push({ x: x + (f - 2.5) * 0.015, y: y - j * 0.03, z: 0 });
        }
      }
    } else {
      // Standard C shape
      pts.push({ x: x + 0.04, y: y - 0.03, z: 0 });
      pts.push({ x: x + 0.05, y: y - 0.06, z: 0 });
      pts.push({ x: x + 0.05, y: y - 0.08, z: 0 });
      pts.push({ x: x + 0.04, y: y - 0.1, z: 0 });
      for (let f = 1; f <= 4; f++) {
        for (let j = 1; j <= 4; j++) {
          pts.push({ x: x - 0.02 + j * 0.01, y: y - j * 0.022, z: 0 });
        }
      }
    }

    return pts;
  }

  private createMockPose(midX: number, midY: number): LandmarkPoint[] {
    const pts: LandmarkPoint[] = [];
    for (let i = 0; i < 18; i++) {
      pts.push({
        x: midX + (i % 2 === 0 ? -0.1 : 0.1),
        y: midY + Math.floor(i / 2) * 0.05,
        z: 0,
        visibility: 1.0,
      });
    }
    return pts;
  }

  private createMockFace(x: number, y: number): LandmarkPoint[] {
    const pts: LandmarkPoint[] = [];
    for (let i = 0; i < 20; i++) {
      pts.push({
        x: x + ((i % 5) - 2) * 0.02,
        y: y + Math.floor(i / 5) * 0.02,
        z: 0,
      });
    }
    return pts;
  }
}

export const sampleSignSimulator = new SampleSignSimulator();
