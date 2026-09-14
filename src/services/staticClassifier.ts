import { LandmarkPoint, SignPrediction } from '../types';

interface HandGeometry {
  thumbExtended: number; // 0 (curled) to 1 (extended)
  indexExtended: number;
  middleExtended: number;
  ringExtended: number;
  pinkyExtended: number;
  thumbIndexDist: number; // Normalized distance
  thumbMiddleDist: number;
  thumbRingDist: number;
  thumbPinkyDist: number;
  indexMiddleSpread: number;
  middleRingSpread: number;
  isIndexHooked: boolean;
  palmOrientation: 'front' | 'down' | 'side' | 'up';
}

export interface PrototypePattern {
  gloss: string;
  category: 'Alphabet' | 'Number';
  geometry: Partial<HandGeometry>;
  twoHanded?: boolean;
}

export class StaticSignClassifier {
  private confidenceThreshold: number = 0.65;
  private recentPredictions: string[] = [];
  private stabilityCount: number = 0;
  private currentStableGloss: string | null = null;

  // Canonical ISL Fingerspelling & Digit Prototypes
  private prototypes: PrototypePattern[] = [
    // Alphabet A-Z
    {
      gloss: 'A',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.8, indexExtended: 0.1, middleExtended: 0.1, ringExtended: 0.1, pinkyExtended: 0.1 },
    },
    {
      gloss: 'B',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.95, middleExtended: 0.95, ringExtended: 0.95, pinkyExtended: 0.95, indexMiddleSpread: 0.1 },
    },
    {
      gloss: 'C',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.6, indexExtended: 0.55, middleExtended: 0.55, ringExtended: 0.55, pinkyExtended: 0.55, thumbIndexDist: 0.45 },
    },
    {
      gloss: 'D',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.4, indexExtended: 0.95, middleExtended: 0.2, ringExtended: 0.2, pinkyExtended: 0.2, thumbMiddleDist: 0.15 },
    },
    {
      gloss: 'E',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.3, indexExtended: 0.2, middleExtended: 0.2, ringExtended: 0.2, pinkyExtended: 0.2, thumbIndexDist: 0.2 },
    },
    {
      gloss: 'F',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.4, indexExtended: 0.25, middleExtended: 0.95, ringExtended: 0.95, pinkyExtended: 0.95, thumbIndexDist: 0.12 },
    },
    {
      gloss: 'G',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.7, indexExtended: 0.85, middleExtended: 0.15, ringExtended: 0.15, pinkyExtended: 0.15, palmOrientation: 'side' },
    },
    {
      gloss: 'H',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.4, indexExtended: 0.9, middleExtended: 0.9, ringExtended: 0.15, pinkyExtended: 0.15, palmOrientation: 'side' },
    },
    {
      gloss: 'I',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.15, middleExtended: 0.15, ringExtended: 0.15, pinkyExtended: 0.95 },
    },
    {
      gloss: 'K',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.6, indexExtended: 0.95, middleExtended: 0.9, ringExtended: 0.15, pinkyExtended: 0.15, indexMiddleSpread: 0.35 },
    },
    {
      gloss: 'L',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.95, indexExtended: 0.95, middleExtended: 0.15, ringExtended: 0.15, pinkyExtended: 0.15, thumbIndexDist: 0.7 },
    },
    {
      gloss: 'M',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.3, middleExtended: 0.3, ringExtended: 0.3, pinkyExtended: 0.15 },
    },
    {
      gloss: 'N',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.3, middleExtended: 0.3, ringExtended: 0.15, pinkyExtended: 0.15 },
    },
    {
      gloss: 'O',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.5, indexExtended: 0.4, middleExtended: 0.4, ringExtended: 0.4, pinkyExtended: 0.4, thumbIndexDist: 0.1 },
    },
    {
      gloss: 'R',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.85, middleExtended: 0.85, ringExtended: 0.15, pinkyExtended: 0.15, indexMiddleSpread: 0.05 },
    },
    {
      gloss: 'S',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.1, indexExtended: 0.1, middleExtended: 0.1, ringExtended: 0.1, pinkyExtended: 0.1 },
    },
    {
      gloss: 'U',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.9, middleExtended: 0.9, ringExtended: 0.15, pinkyExtended: 0.15, indexMiddleSpread: 0.08 },
    },
    {
      gloss: 'V',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.95, middleExtended: 0.95, ringExtended: 0.15, pinkyExtended: 0.15, indexMiddleSpread: 0.4 },
    },
    {
      gloss: 'W',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.95, middleExtended: 0.95, ringExtended: 0.95, pinkyExtended: 0.15, indexMiddleSpread: 0.3, middleRingSpread: 0.3 },
    },
    {
      gloss: 'X',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.2, indexExtended: 0.45, middleExtended: 0.15, ringExtended: 0.15, pinkyExtended: 0.15, isIndexHooked: true },
    },
    {
      gloss: 'Y',
      category: 'Alphabet',
      geometry: { thumbExtended: 0.95, indexExtended: 0.15, middleExtended: 0.15, ringExtended: 0.15, pinkyExtended: 0.95, thumbIndexDist: 0.8 },
    },

    // Digits 1-9
    {
      gloss: '1',
      category: 'Number',
      geometry: { thumbExtended: 0.1, indexExtended: 0.95, middleExtended: 0.1, ringExtended: 0.1, pinkyExtended: 0.1 },
    },
    {
      gloss: '2',
      category: 'Number',
      geometry: { thumbExtended: 0.1, indexExtended: 0.95, middleExtended: 0.95, ringExtended: 0.1, pinkyExtended: 0.1, indexMiddleSpread: 0.35 },
    },
    {
      gloss: '3',
      category: 'Number',
      geometry: { thumbExtended: 0.85, indexExtended: 0.95, middleExtended: 0.95, ringExtended: 0.1, pinkyExtended: 0.1 },
    },
    {
      gloss: '4',
      category: 'Number',
      geometry: { thumbExtended: 0.15, indexExtended: 0.95, middleExtended: 0.95, ringExtended: 0.95, pinkyExtended: 0.95 },
    },
    {
      gloss: '5',
      category: 'Number',
      geometry: { thumbExtended: 0.95, indexExtended: 0.95, middleExtended: 0.95, ringExtended: 0.95, pinkyExtended: 0.95, indexMiddleSpread: 0.35 },
    },
    {
      gloss: '6',
      category: 'Number',
      geometry: { thumbExtended: 0.5, indexExtended: 0.9, middleExtended: 0.9, ringExtended: 0.9, pinkyExtended: 0.2, thumbPinkyDist: 0.12 },
    },
    {
      gloss: '7',
      category: 'Number',
      geometry: { thumbExtended: 0.5, indexExtended: 0.9, middleExtended: 0.9, ringExtended: 0.2, pinkyExtended: 0.9, thumbRingDist: 0.12 },
    },
    {
      gloss: '8',
      category: 'Number',
      geometry: { thumbExtended: 0.5, indexExtended: 0.9, middleExtended: 0.2, ringExtended: 0.9, pinkyExtended: 0.9, thumbMiddleDist: 0.12 },
    },
    {
      gloss: '9',
      category: 'Number',
      geometry: { thumbExtended: 0.5, indexExtended: 0.2, middleExtended: 0.9, ringExtended: 0.9, pinkyExtended: 0.9, thumbIndexDist: 0.12 },
    },
  ];

  setThreshold(threshold: number) {
    this.confidenceThreshold = Math.max(0.3, Math.min(0.95, threshold));
  }

  getThreshold(): number {
    return this.confidenceThreshold;
  }

  /**
   * Classifies static handshape from detected hand keypoints (primary hand or two hands).
   */
  classifyHand(
    handPoints: LandmarkPoint[] | null,
    secondaryHandPoints: LandmarkPoint[] | null = null,
    timestamp: number = Date.now()
  ): SignPrediction {
    const startTime = performance.now();

    if (!handPoints || handPoints.length !== 21) {
      return {
        gloss: 'NO_HAND',
        confidence: 0,
        category: 'rest',
        timestamp,
        latencyMs: performance.now() - startTime,
        motionEnergy: 0,
      };
    }

    // Extract scale-invariant hand geometry
    const geo = this.computeHandGeometry(handPoints);

    // Compute similarity scores across prototypes
    let bestGloss = '';
    let bestScore = -1;
    let runnerUpScore = -1;

    for (const proto of this.prototypes) {
      const score = this.calculatePrototypeMatch(geo, proto.geometry);
      if (score > bestScore) {
        runnerUpScore = bestScore;
        bestScore = score;
        bestGloss = proto.gloss;
      } else if (score > runnerUpScore) {
        runnerUpScore = score;
      }
    }

    const latencyMs = performance.now() - startTime;
    const isAmbiguous = bestScore - runnerUpScore < 0.08;

    // Confidence Handling:
    // If top score < threshold or margin between top two is tiny, mark as unclear
    if (bestScore < this.confidenceThreshold || isAmbiguous) {
      return {
        gloss: 'UNCLEAR',
        confidence: Math.round(bestScore * 100) / 100,
        category: 'unclear',
        timestamp,
        latencyMs,
        motionEnergy: 0,
        isAmbiguous: true,
      };
    }

    // Temporal smoothing filter to eliminate single-frame flickering
    this.recentPredictions.push(bestGloss);
    if (this.recentPredictions.length > 5) {
      this.recentPredictions.shift();
    }

    const occurrences = this.recentPredictions.filter((g) => g === bestGloss).length;
    const smoothedConfidence = (bestScore * 0.7) + ((occurrences / this.recentPredictions.length) * 0.3);

    return {
      gloss: bestGloss,
      confidence: Math.round(smoothedConfidence * 100) / 100,
      category: 'fingerspelling',
      timestamp,
      latencyMs,
      motionEnergy: 0,
    };
  }

  /**
   * Derives invariant geometric angles, curl ratios, and finger spread.
   */
  private computeHandGeometry(pts: LandmarkPoint[]): HandGeometry {
    const wrist = pts[0];
    const palmScale = Math.hypot(pts[9].x - wrist.x, pts[9].y - wrist.y) || 1;

    // Extension ratio: distance from wrist to fingertip relative to wrist to knuckle
    const thumbExt = this.getFingerExtension(wrist, pts[2], pts[4], palmScale);
    const indexExt = this.getFingerExtension(wrist, pts[5], pts[8], palmScale);
    const middleExt = this.getFingerExtension(wrist, pts[9], pts[12], palmScale);
    const ringExt = this.getFingerExtension(wrist, pts[13], pts[16], palmScale);
    const pinkyExt = this.getFingerExtension(wrist, pts[17], pts[20], palmScale);

    // Fingertip-to-thumb distances normalized by palm scale
    const thumbIndexDist = Math.hypot(pts[4].x - pts[8].x, pts[4].y - pts[8].y) / palmScale;
    const thumbMiddleDist = Math.hypot(pts[4].x - pts[12].x, pts[4].y - pts[12].y) / palmScale;
    const thumbRingDist = Math.hypot(pts[4].x - pts[16].x, pts[4].y - pts[16].y) / palmScale;
    const thumbPinkyDist = Math.hypot(pts[4].x - pts[20].x, pts[4].y - pts[20].y) / palmScale;

    // Finger spreads
    const indexMiddleSpread = Math.hypot(pts[8].x - pts[12].x, pts[8].y - pts[12].y) / palmScale;
    const middleRingSpread = Math.hypot(pts[12].x - pts[16].x, pts[12].y - pts[16].y) / palmScale;

    // Check if index finger is hooked (landmark 8 closer to knuckle 5 than joint 6)
    const isIndexHooked = pts[8].y > pts[6].y && indexExt > 0.3;

    return {
      thumbExtended: thumbExt,
      indexExtended: indexExt,
      middleExtended: middleExt,
      ringExtended: ringExt,
      pinkyExtended: pinkyExt,
      thumbIndexDist,
      thumbMiddleDist,
      thumbRingDist,
      thumbPinkyDist,
      indexMiddleSpread,
      middleRingSpread,
      isIndexHooked,
      palmOrientation: pts[9].y < wrist.y ? 'front' : 'down',
    };
  }

  private getFingerExtension(
    wrist: LandmarkPoint,
    knuckle: LandmarkPoint,
    tip: LandmarkPoint,
    palmScale: number
  ): number {
    const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const knuckleDist = Math.hypot(knuckle.x - wrist.x, knuckle.y - wrist.y);
    const ratio = (tipDist - knuckleDist) / palmScale;
    // Map ratio between 0 (curled back into palm) to 1 (straight extended)
    return Math.max(0, Math.min(1, (ratio + 0.1) / 0.95));
  }

  private calculatePrototypeMatch(geo: HandGeometry, target: Partial<HandGeometry>): number {
    let penalty = 0;
    let checks = 0;

    const compare = (val: number | undefined, targetVal: number | undefined, weight = 1.0) => {
      if (targetVal !== undefined && val !== undefined) {
        const diff = Math.abs(val - targetVal);
        penalty += diff * weight;
        checks += weight;
      }
    };

    compare(geo.thumbExtended, target.thumbExtended, 1.2);
    compare(geo.indexExtended, target.indexExtended, 1.5);
    compare(geo.middleExtended, target.middleExtended, 1.4);
    compare(geo.ringExtended, target.ringExtended, 1.2);
    compare(geo.pinkyExtended, target.pinkyExtended, 1.3);

    if (target.thumbIndexDist !== undefined) {
      compare(geo.thumbIndexDist, target.thumbIndexDist, 1.0);
    }
    if (target.thumbMiddleDist !== undefined) {
      compare(geo.thumbMiddleDist, target.thumbMiddleDist, 1.0);
    }
    if (target.indexMiddleSpread !== undefined) {
      compare(geo.indexMiddleSpread, target.indexMiddleSpread, 1.1);
    }
    if (target.isIndexHooked !== undefined) {
      if (geo.isIndexHooked !== target.isIndexHooked) {
        penalty += 0.4;
      }
      checks += 0.4;
    }

    if (checks === 0) return 0;
    const avgPenalty = penalty / checks;
    return Math.max(0, 1 - avgPenalty);
  }
}

export const staticClassifier = new StaticSignClassifier();
