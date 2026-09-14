import { NormalizedLandmarkFrame, SignPrediction, LandmarkPoint } from '../types';

export interface DynamicSignDescriptor {
  gloss: string;
  category: 'Greeting' | 'Need/Emergency' | 'Question' | 'General';
  description: string;
  hindiMeaning: string;
  twoHanded: boolean;
  minMotion: number;
  matchScore: (window: NormalizedLandmarkFrame[]) => number;
}

export class DynamicSignClassifier {
  private windowSize: number = 24; // ~800ms at 30fps
  private frameBuffer: NormalizedLandmarkFrame[] = [];
  private confidenceThreshold: number = 0.65;
  private lastTriggeredGloss: string | null = null;
  private lastTriggeredTime: number = 0;
  private cooldownMs: number = 1100; // Refractory period to avoid duplicate triggers

  private dynamicSigns: DynamicSignDescriptor[] = [];

  constructor() {
    this.initDynamicSignPatterns();
  }

  setThreshold(threshold: number) {
    this.confidenceThreshold = Math.max(0.3, Math.min(0.95, threshold));
  }

  getThreshold(): number {
    return this.confidenceThreshold;
  }

  getVocabulary(): string[] {
    return this.dynamicSigns.map((s) => s.gloss);
  }

  /**
   * Pushes a new normalized frame into the sliding window buffer and evaluates.
   */
  processFrame(frame: NormalizedLandmarkFrame): SignPrediction {
    const startTime = performance.now();
    const now = Date.now();

    this.frameBuffer.push(frame);
    if (this.frameBuffer.length > this.windowSize) {
      this.frameBuffer.shift();
    }

    // 1. Boundary & Segmentation Check: Rest Pose
    if (frame.isRestPose || (!frame.leftHand && !frame.rightHand)) {
      return {
        gloss: 'REST',
        confidence: 1.0,
        category: 'rest',
        timestamp: now,
        latencyMs: performance.now() - startTime,
        motionEnergy: frame.motionEnergy,
      };
    }

    // 2. Motion Energy Gate: Wait until buffer is filled and motion threshold exceeded
    if (this.frameBuffer.length < 12) {
      return {
        gloss: 'BUFFERING',
        confidence: 0,
        category: 'rest',
        timestamp: now,
        latencyMs: performance.now() - startTime,
        motionEnergy: frame.motionEnergy,
      };
    }

    // Compute average motion energy across the sliding window
    const avgMotion =
      this.frameBuffer.reduce((sum, f) => sum + f.motionEnergy, 0) / this.frameBuffer.length;

    if (avgMotion < 0.035) {
      // Hands are relatively static — handled by static classifier or hold-state
      return {
        gloss: 'STILL',
        confidence: 0.5,
        category: 'rest',
        timestamp: now,
        latencyMs: performance.now() - startTime,
        motionEnergy: avgMotion,
      };
    }

    // Check refractory cooldown
    if (now - this.lastTriggeredTime < this.cooldownMs) {
      return {
        gloss: 'COOLDOWN',
        confidence: 0,
        category: 'rest',
        timestamp: now,
        latencyMs: performance.now() - startTime,
        motionEnergy: avgMotion,
      };
    }

    // 3. Evaluate Sliding Window Against Dynamic Temporal Sign Models
    let bestGloss = '';
    let bestScore = -1;
    let secondScore = -1;

    for (const descriptor of this.dynamicSigns) {
      const score = descriptor.matchScore(this.frameBuffer);
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        bestGloss = descriptor.gloss;
      } else if (score > secondScore) {
        secondScore = score;
      }
    }

    const latencyMs = performance.now() - startTime;
    const isAmbiguous = bestScore - secondScore < 0.07;

    // 4. Confidence Handling:
    // If below confidence threshold, distinctly surface UNCLEAR to user rather than a false guess
    if (bestScore < this.confidenceThreshold || isAmbiguous) {
      return {
        gloss: 'UNCLEAR',
        confidence: Math.round(bestScore * 100) / 100,
        category: 'unclear',
        timestamp: now,
        latencyMs,
        motionEnergy: avgMotion,
        isAmbiguous: true,
      };
    }

    // High confidence match! Set cooldown and trigger
    this.lastTriggeredGloss = bestGloss;
    this.lastTriggeredTime = now;

    return {
      gloss: bestGloss,
      confidence: Math.round(bestScore * 100) / 100,
      category: 'dynamic',
      timestamp: now,
      latencyMs,
      motionEnergy: avgMotion,
    };
  }

  clearBuffer() {
    this.frameBuffer = [];
    this.lastTriggeredGloss = null;
    this.lastTriggeredTime = 0;
  }

  /**
   * Geometric and trajectory extraction helpers for dynamic temporal signs.
   */
  private initDynamicSignPatterns() {
    // 1. NAMASTE / HELLO: Both hands meet at chest center, move together, palms upright
    this.dynamicSigns.push({
      gloss: 'NAMASTE',
      category: 'Greeting',
      description: 'Hands joined together in prayer posture at chest level',
      hindiMeaning: 'नमस्ते',
      twoHanded: true,
      minMotion: 0.04,
      matchScore: (win) => {
        const mid = Math.floor(win.length / 2);
        const end = win[win.length - 1];
        const midFrame = win[mid];

        if (!end.leftHand || !end.rightHand) return 0.2;

        const leftWrist = end.leftHand[0];
        const rightWrist = end.rightHand[0];
        const dist = Math.hypot(leftWrist.x - rightWrist.x, leftWrist.y - rightWrist.y);

        // Hands are close together at center chest (y roughly 0.4 - 0.7)
        const closeScore = Math.max(0, 1 - dist / 0.22);
        const chestHeight = leftWrist.y > 0.35 && leftWrist.y < 0.75 ? 1.0 : 0.4;
        const upright = end.leftHand[12].y < leftWrist.y && end.rightHand[12].y < rightWrist.y ? 1.0 : 0.5;

        return closeScore * 0.5 + chestHeight * 0.25 + upright * 0.25;
      },
    });

    // 2. THANK YOU: Hand moves from chin / mouth forward and slightly down
    this.dynamicSigns.push({
      gloss: 'THANK YOU',
      category: 'Greeting',
      description: 'Open hand touches chin/lips then extends forward towards viewer',
      hindiMeaning: 'धन्यवाद',
      twoHanded: false,
      minMotion: 0.05,
      matchScore: (win) => {
        const start = win[0];
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        const startHand = start.rightHand || start.leftHand;

        if (!hand || !startHand) return 0.1;

        // Moves from chin (y ~ 0.3) downward/forward (y ~ 0.5)
        const dy = hand[0].y - startHand[0].y; // positive means moving down
        const dz = (startHand[0].z || 0) - (hand[0].z || 0); // moves toward camera
        const nearChinStart = startHand[0].y < 0.45;

        if (nearChinStart && dy > 0.08) {
          return 0.88;
        }
        return 0.2;
      },
    });

    // 3. PLEASE: Circular motion on chest or open prayer stroke
    this.dynamicSigns.push({
      gloss: 'PLEASE',
      category: 'General',
      description: 'Flat palm rubbing or sliding softly across chest',
      hindiMeaning: 'कृपया',
      twoHanded: false,
      minMotion: 0.04,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        // Check horizontal displacement oscillation on chest
        const xs = win.map((f) => (f.rightHand ? f.rightHand[0].x : f.leftHand ? f.leftHand[0].x : 0.5));
        const ys = win.map((f) => (f.rightHand ? f.rightHand[0].y : f.leftHand ? f.leftHand[0].y : 0.5));

        const xRange = Math.max(...xs) - Math.min(...xs);
        const yRange = Math.max(...ys) - Math.min(...ys);
        const onChest = hand[0].y > 0.4 && hand[0].y < 0.7;

        if (onChest && xRange > 0.06 && yRange < 0.12) {
          return 0.84;
        }
        return 0.2;
      },
    });

    // 4. HELP: One hand supported by the other lifting upward
    this.dynamicSigns.push({
      gloss: 'HELP',
      category: 'Need/Emergency',
      description: 'Closed fist resting on flat palm, both lifting together',
      hindiMeaning: 'मदद',
      twoHanded: true,
      minMotion: 0.05,
      matchScore: (win) => {
        const start = win[0];
        const end = win[win.length - 1];
        if (!start.leftHand || !start.rightHand || !end.leftHand || !end.rightHand) return 0.2;

        const startY = (start.leftHand[0].y + start.rightHand[0].y) / 2;
        const endY = (end.leftHand[0].y + end.rightHand[0].y) / 2;
        const upwardMotion = startY - endY; // positive = moved up

        const dist = Math.hypot(end.leftHand[0].x - end.rightHand[0].x, end.leftHand[0].y - end.rightHand[0].y);
        const together = dist < 0.22;

        if (together && upwardMotion > 0.07) {
          return 0.9;
        }
        return 0.25;
      },
    });

    // 5. WATER: Hand moves toward mouth with drink/W gesture
    this.dynamicSigns.push({
      gloss: 'WATER',
      category: 'Need/Emergency',
      description: 'Hand moves repeatedly toward mouth / chin with drinking motion',
      hindiMeaning: 'पानी',
      twoHanded: false,
      minMotion: 0.04,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        // Fingertips near chin/mouth (y < 0.4, x near center)
        const nearMouth = hand[8].y < 0.4 && Math.abs(hand[8].x - 0.5) < 0.2;
        const motion = win.reduce((acc, f) => acc + f.motionEnergy, 0) / win.length;

        if (nearMouth && motion > 0.04) {
          return 0.86;
        }
        return 0.2;
      },
    });

    // 6. FOOD: Fingertips bunched touching lips/mouth
    this.dynamicSigns.push({
      gloss: 'FOOD',
      category: 'Need/Emergency',
      description: 'Fingertips clustered together moving to lips repeatedly',
      hindiMeaning: 'खाना',
      twoHanded: false,
      minMotion: 0.04,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        // Fingers clustered (distance between thumb and fingertips is minimal)
        const cluster =
          Math.hypot(hand[4].x - hand[8].x, hand[4].y - hand[8].y) +
          Math.hypot(hand[4].x - hand[12].x, hand[4].y - hand[12].y);
        const nearLips = hand[4].y < 0.42 && Math.abs(hand[4].x - 0.5) < 0.18;

        if (nearLips && cluster < 0.15) {
          return 0.91;
        }
        return 0.2;
      },
    });

    // 7. WHERE: Both hands palms up shaking laterally outward
    this.dynamicSigns.push({
      gloss: 'WHERE',
      category: 'Question',
      description: 'Both hands palms up moving side to side inquiring location',
      hindiMeaning: 'कहाँ',
      twoHanded: true,
      minMotion: 0.05,
      matchScore: (win) => {
        const end = win[win.length - 1];
        if (!end.leftHand || !end.rightHand) return 0.15;

        const leftSpread = end.leftHand[0].x;
        const rightSpread = end.rightHand[0].x;
        const handsWide = Math.abs(rightSpread - leftSpread) > 0.4;
        const chestLevel = end.leftHand[0].y > 0.45 && end.rightHand[0].y > 0.45;

        // Non-manual marker: head slight tilt or brow furrow in face points
        if (handsWide && chestLevel) {
          return 0.88;
        }
        return 0.2;
      },
    });

    // 8. WHAT: Shaking index finger or outward pulse of palms
    this.dynamicSigns.push({
      gloss: 'WHAT',
      category: 'Question',
      description: 'Index finger shaking or quick outward question flick',
      hindiMeaning: 'क्या',
      twoHanded: false,
      minMotion: 0.05,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        // Index upright (landmark 8 higher than knuckle 5)
        const indexUp = hand[8].y < hand[5].y - 0.08;
        // Lateral oscillation in x
        const xs = win.map((f) => (f.rightHand ? f.rightHand[8].x : f.leftHand ? f.leftHand[8].x : 0));
        const lateralWiggle = Math.max(...xs) - Math.min(...xs);

        if (indexUp && lateralWiggle > 0.06) {
          return 0.87;
        }
        return 0.2;
      },
    });

    // 9. NAME: Two fingers tapping forehead or together
    this.dynamicSigns.push({
      gloss: 'NAME',
      category: 'General',
      description: 'Index and middle fingers tapping or touching at forehead/chin',
      hindiMeaning: 'नाम',
      twoHanded: false,
      minMotion: 0.03,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        const nearHead = hand[8].y < 0.35;
        const twoFingers = hand[8].y < hand[6].y && hand[12].y < hand[10].y && hand[16].y > hand[14].y;

        if (nearHead && twoFingers) {
          return 0.89;
        }
        return 0.2;
      },
    });

    // 10. ME / I: Index finger pointing to center chest
    this.dynamicSigns.push({
      gloss: 'ME',
      category: 'General',
      description: 'Index finger points inwards to chest',
      hindiMeaning: 'मैं / मुझे',
      twoHanded: false,
      minMotion: 0.03,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        const onChest = hand[8].y > 0.45 && hand[8].y < 0.7 && Math.abs(hand[8].x - 0.5) < 0.15;
        return onChest ? 0.85 : 0.2;
      },
    });

    // 11. YOU: Index finger pointing outward toward camera
    this.dynamicSigns.push({
      gloss: 'YOU',
      category: 'General',
      description: 'Index finger pointing forward to conversational partner',
      hindiMeaning: 'आप / तुम',
      twoHanded: false,
      minMotion: 0.04,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        const indexPointingForward = hand[8].z < hand[5].z - 0.05 && hand[8].y > 0.35 && hand[8].y < 0.65;
        return indexPointingForward ? 0.86 : 0.2;
      },
    });

    // 12. NICE: Flat dominant hand slides across non-dominant palm
    this.dynamicSigns.push({
      gloss: 'NICE',
      category: 'General',
      description: 'Dominant palm slides smoothly forward across base palm',
      hindiMeaning: 'अच्छा',
      twoHanded: true,
      minMotion: 0.05,
      matchScore: (win) => {
        const start = win[0];
        const end = win[win.length - 1];
        if (!start.leftHand || !start.rightHand || !end.leftHand || !end.rightHand) return 0.1;

        const dist = Math.hypot(end.leftHand[0].x - end.rightHand[0].x, end.leftHand[0].y - end.rightHand[0].y);
        const sliding = Math.abs(end.rightHand[0].x - start.rightHand[0].x) > 0.07;

        if (dist < 0.25 && sliding) {
          return 0.85;
        }
        return 0.2;
      },
    });

    // 13. MEET: Both index fingers upright moving together from sides to touch
    this.dynamicSigns.push({
      gloss: 'MEET',
      category: 'General',
      description: 'Both index fingers upright approaching each other and meeting',
      hindiMeaning: 'मिलना',
      twoHanded: true,
      minMotion: 0.05,
      matchScore: (win) => {
        const start = win[0];
        const end = win[win.length - 1];
        if (!start.leftHand || !start.rightHand || !end.leftHand || !end.rightHand) return 0.1;

        const startDist = Math.abs(start.leftHand[8].x - start.rightHand[8].x);
        const endDist = Math.abs(end.leftHand[8].x - end.rightHand[8].x);

        if (startDist > 0.3 && endDist < 0.12) {
          return 0.92;
        }
        return 0.2;
      },
    });

    // 14. YES: Fist nodding up and down
    this.dynamicSigns.push({
      gloss: 'YES',
      category: 'General',
      description: 'Fist nodding repeatedly at wrist like head agreement',
      hindiMeaning: 'हाँ',
      twoHanded: false,
      minMotion: 0.04,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        const ys = win.map((f) => (f.rightHand ? f.rightHand[8].y : f.leftHand ? f.leftHand[8].y : 0.5));
        const verticalDip = Math.max(...ys) - Math.min(...ys);

        // All fingers curled in fist
        const isFist = hand[8].y > hand[6].y && hand[12].y > hand[10].y;
        if (isFist && verticalDip > 0.07) {
          return 0.89;
        }
        return 0.2;
      },
    });

    // 15. NO: Index and middle fingers snapping to thumb
    this.dynamicSigns.push({
      gloss: 'NO',
      category: 'General',
      description: 'Index and middle fingers snapping shut to thumb',
      hindiMeaning: 'नहीं',
      twoHanded: false,
      minMotion: 0.04,
      matchScore: (win) => {
        const start = win[0];
        const end = win[win.length - 1];
        const hStart = start.rightHand || start.leftHand;
        const hEnd = end.rightHand || end.leftHand;
        if (!hStart || !hEnd) return 0.1;

        const startOpen = Math.hypot(hStart[4].x - hStart[8].x, hStart[4].y - hStart[8].y);
        const endClosed = Math.hypot(hEnd[4].x - hEnd[8].x, hEnd[4].y - hEnd[8].y);

        if (startOpen > 0.12 && endClosed < 0.05) {
          return 0.9;
        }
        return 0.2;
      },
    });

    // 16. HOUSE: Fingertips touch forming peaked roof triangle
    this.dynamicSigns.push({
      gloss: 'HOUSE',
      category: 'General',
      description: 'Fingertips of both flat hands touching at an angle forming a roof',
      hindiMeaning: 'घर',
      twoHanded: true,
      minMotion: 0.04,
      matchScore: (win) => {
        const end = win[win.length - 1];
        if (!end.leftHand || !end.rightHand) return 0.1;

        const tipDist = Math.hypot(end.leftHand[12].x - end.rightHand[12].x, end.leftHand[12].y - end.rightHand[12].y);
        const wristDist = Math.hypot(end.leftHand[0].x - end.rightHand[0].x, end.leftHand[0].y - end.rightHand[0].y);

        // Tips close together, wrists wide apart (peaked roof triangle)
        if (tipDist < 0.1 && wristDist > 0.3) {
          return 0.92;
        }
        return 0.2;
      },
    });

    // 17. SCHOOL: Clapping flat palms or book opening motion
    this.dynamicSigns.push({
      gloss: 'SCHOOL',
      category: 'General',
      description: 'Hands clapping horizontally or opening like pages of a book',
      hindiMeaning: 'स्कूल / विद्यालय',
      twoHanded: true,
      minMotion: 0.05,
      matchScore: (win) => {
        const end = win[win.length - 1];
        if (!end.leftHand || !end.rightHand) return 0.1;

        const dist = Math.hypot(end.leftHand[0].x - end.rightHand[0].x, end.leftHand[0].y - end.rightHand[0].y);
        const motion = win.reduce((acc, f) => acc + f.motionEnergy, 0) / win.length;

        if (dist < 0.18 && motion > 0.05) {
          return 0.86;
        }
        return 0.2;
      },
    });

    // 18. WORK: Dominant wrist taps non-dominant wrist
    this.dynamicSigns.push({
      gloss: 'WORK',
      category: 'General',
      description: 'Dominant fist wrist tapping top of non-dominant wrist',
      hindiMeaning: 'काम',
      twoHanded: true,
      minMotion: 0.04,
      matchScore: (win) => {
        const end = win[win.length - 1];
        if (!end.leftHand || !end.rightHand) return 0.1;

        const wristDist = Math.hypot(end.leftHand[0].x - end.rightHand[0].x, end.leftHand[0].y - end.rightHand[0].y);
        if (wristDist < 0.14) {
          return 0.88;
        }
        return 0.2;
      },
    });

    // 19. DOCTOR: Feeling pulse on wrist or cross on arm
    this.dynamicSigns.push({
      gloss: 'DOCTOR',
      category: 'Need/Emergency',
      description: 'Fingertips placed gently on non-dominant wrist to check pulse',
      hindiMeaning: 'डॉक्टर',
      twoHanded: true,
      minMotion: 0.03,
      matchScore: (win) => {
        const end = win[win.length - 1];
        if (!end.leftHand || !end.rightHand) return 0.1;

        // Right fingertips (landmark 8, 12) touching left wrist (landmark 0)
        const touchDist = Math.hypot(end.rightHand[8].x - end.leftHand[0].x, end.rightHand[8].y - end.leftHand[0].y);
        if (touchDist < 0.15) {
          return 0.91;
        }
        return 0.2;
      },
    });

    // 20. GOOD: Thumbs up gesture moving forward
    this.dynamicSigns.push({
      gloss: 'GOOD',
      category: 'General',
      description: 'Thumbs up gesture moving forward with approval',
      hindiMeaning: 'अच्छा',
      twoHanded: false,
      minMotion: 0.03,
      matchScore: (win) => {
        const end = win[win.length - 1];
        const hand = end.rightHand || end.leftHand;
        if (!hand) return 0.1;

        const thumbUp = hand[4].y < hand[3].y && hand[4].y < hand[8].y - 0.06;
        const otherCurled = hand[8].y > hand[6].y && hand[12].y > hand[10].y;

        if (thumbUp && otherCurled) {
          return 0.93;
        }
        return 0.2;
      },
    });

    // 21. BAD: Hand near chin flipping downward
    this.dynamicSigns.push({
      gloss: 'BAD',
      category: 'General',
      description: 'Hand starts at chin and flips abruptly downwards with palm down',
      hindiMeaning: 'बुरा / खराब',
      twoHanded: false,
      minMotion: 0.05,
      matchScore: (win) => {
        const start = win[0];
        const end = win[win.length - 1];
        const hStart = start.rightHand || start.leftHand;
        const hEnd = end.rightHand || end.leftHand;
        if (!hStart || !hEnd) return 0.1;

        const startNearChin = hStart[0].y < 0.45;
        const downwardFlip = hEnd[0].y - hStart[0].y > 0.12;

        if (startNearChin && downwardFlip) {
          return 0.88;
        }
        return 0.2;
      },
    });

    // 22. TIME: Index finger taps wrist
    this.dynamicSigns.push({
      gloss: 'TIME',
      category: 'General',
      description: 'Index finger tapping the wrist location of a wristwatch',
      hindiMeaning: 'समय / वक्त',
      twoHanded: true,
      minMotion: 0.04,
      matchScore: (win) => {
        const end = win[win.length - 1];
        if (!end.leftHand || !end.rightHand) return 0.1;

        const indexToWrist = Math.hypot(end.rightHand[8].x - end.leftHand[0].x, end.rightHand[8].y - end.leftHand[0].y);
        if (indexToWrist < 0.14) {
          return 0.91;
        }
        return 0.2;
      },
    });

    // 23. STOP: Flat hand chopping onto horizontal base palm
    this.dynamicSigns.push({
      gloss: 'STOP',
      category: 'General',
      description: 'Dominant open palm chops firmly down into horizontal base palm',
      hindiMeaning: 'रुकें',
      twoHanded: true,
      minMotion: 0.05,
      matchScore: (win) => {
        const end = win[win.length - 1];
        if (!end.leftHand || !end.rightHand) return 0.1;

        const chopDist = Math.hypot(end.rightHand[0].x - end.leftHand[9].x, end.rightHand[0].y - end.leftHand[9].y);
        if (chopDist < 0.15) {
          return 0.9;
        }
        return 0.2;
      },
    });
  }
}

export const dynamicClassifier = new DynamicSignClassifier();
