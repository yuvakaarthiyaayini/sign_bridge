/**
 * Reverse Mode: Speech/Text -> Indian Sign Language (ISL) 3D Avatar
 * Explicitly stubbed as future work for v2 roadmap.
 */

export interface AvatarJointRotation {
  boneName: string;
  quaternion: [number, number, number, number];
}

export interface AvatarKeyframe {
  timestampMs: number;
  rotations: AvatarJointRotation[];
  blendshapes: Record<string, number>; // Facial non-manual grammar (eyebrows raised, mouth shape)
}

export interface AvatarKeyframeSequence {
  glossSequence: string[];
  totalDurationMs: number;
  keyframes: AvatarKeyframe[];
}

export interface ISpeechToIslAvatarService {
  /**
   * Converts recognized speech or text string into sequence of 3D skeletal keyframe rotations
   */
  generateAvatarSigningSequence(
    inputText: string,
    sourceLanguage: 'en' | 'hi'
  ): Promise<AvatarKeyframeSequence>;

  /**
   * Initializes Three.js / WebGL canvas with rigged 3D human avatar mesh
   */
  mountAvatarCanvas(container: HTMLElement): void;

  /**
   * Dispatches keyframes to animation mixer
   */
  playSequence(sequence: AvatarKeyframeSequence): void;
}

export class ReverseModeAvatarServiceStub implements ISpeechToIslAvatarService {
  async generateAvatarSigningSequence(
    inputText: string,
    sourceLanguage: 'en' | 'hi'
  ): Promise<AvatarKeyframeSequence> {
    console.info(
      `[ReverseModeAvatarServiceStub] Reverse Mode translation stubbed for v2 roadmap. Received: "${inputText}" (${sourceLanguage})`
    );
    return {
      glossSequence: inputText.toUpperCase().split(' '),
      totalDurationMs: 2000,
      keyframes: [],
    };
  }

  mountAvatarCanvas(container: HTMLElement): void {
    console.info('[ReverseModeAvatarServiceStub] Three.js canvas mount stubbed.');
  }

  playSequence(sequence: AvatarKeyframeSequence): void {
    console.info('[ReverseModeAvatarServiceStub] Play sequence stubbed.');
  }
}

export const reverseModeAvatarStub = new ReverseModeAvatarServiceStub();
