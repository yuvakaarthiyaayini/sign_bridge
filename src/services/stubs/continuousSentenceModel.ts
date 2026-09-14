/**
 * Continuous Sentence-Level Translation Model (CTC-Loss / Transformer Seq2Seq)
 * Explicitly stubbed as future work for v2 roadmap.
 */

export interface ContinuousTranscriptionResult {
  partialSentence: string;
  stableSentence: string;
  wordConfidenceScores: Record<string, number>;
  isBoundaryDetected: boolean;
}

export interface IContinuousSentenceModel {
  /**
   * Accepts streamed 258-dimensional per-frame feature vectors directly into recurrent CTC decoder
   */
  streamLandmarkVector(frameVector: number[]): ContinuousTranscriptionResult;

  /**
   * Resets temporal hidden state upon detected conversational pause or signer boundary
   */
  resetContext(): void;
}

export class ContinuousSentenceModelStub implements IContinuousSentenceModel {
  private bufferLength: number = 0;

  streamLandmarkVector(frameVector: number[]): ContinuousTranscriptionResult {
    this.bufferLength++;
    return {
      partialSentence: '',
      stableSentence: '',
      wordConfidenceScores: {},
      isBoundaryDetected: false,
    };
  }

  resetContext(): void {
    this.bufferLength = 0;
    console.info('[ContinuousSentenceModelStub] Context reset for continuous decoder.');
  }
}

export const continuousSentenceModelStub = new ContinuousSentenceModelStub();
