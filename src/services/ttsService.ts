import { ITtsService } from '../types';

export class WebSpeechTtsService implements ITtsService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeakingNow: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  isAvailable(): boolean {
    return Boolean(this.synth);
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  speak(
    text: string,
    lang: string = 'en-IN',
    rate: number = 0.95,
    pitch: number = 1.0,
    onEndCallback?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || !text.trim()) {
        resolve();
        return;
      }

      // Cancel any ongoing utterance
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Select matching voice
      const voices = this.getVoices();
      let selectedVoice: SpeechSynthesisVoice | undefined;

      if (lang.startsWith('hi')) {
        // Find Hindi voice
        selectedVoice =
          voices.find((v) => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi')) ||
          voices.find((v) => v.lang.includes('IN'));
      } else {
        // Find Indian English voice or standard English
        selectedVoice =
          voices.find((v) => v.lang === 'en-IN') ||
          voices.find((v) => v.lang.startsWith('en'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = lang;
      }

      utterance.onstart = () => {
        this.isSpeakingNow = true;
      };

      utterance.onend = () => {
        this.isSpeakingNow = false;
        if (onEndCallback) onEndCallback();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error / interrupted:', e);
        this.isSpeakingNow = false;
        if (onEndCallback) onEndCallback();
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeakingNow = false;
    }
  }

  isSpeaking(): boolean {
    return this.isSpeakingNow;
  }
}

/**
 * Cloud TTS Seam Implementation
 * Ready to integrate with Google Cloud Text-to-Speech API or ElevenLabs.
 */
export class CloudTtsServiceStub implements ITtsService {
  async speak(text: string, lang: string = 'en-IN'): Promise<void> {
    try {
      const response = await fetch('/api/cloud-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });
      const data = await response.json();
      console.log('[CloudTtsSeam] Dispatched to cloud endpoint:', data);

      // Falls back to WebSpeech for audible feedback in demo
      const webTts = new WebSpeechTtsService();
      await webTts.speak(text, lang);
    } catch (err) {
      console.error('[CloudTtsSeam] Error:', err);
    }
  }

  stop(): void {
    window.speechSynthesis?.cancel();
  }

  isAvailable(): boolean {
    return true;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return [];
  }
}

export const webSpeechTts = new WebSpeechTtsService();
export const cloudTtsStub = new CloudTtsServiceStub();
