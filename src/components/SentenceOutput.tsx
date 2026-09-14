import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, MessageSquareQuote, Check, Languages } from 'lucide-react';
import { TranslationResult } from '../types';
import { webSpeechTts } from '../services/ttsService';

interface SentenceOutputProps {
  translation: TranslationResult | null;
  preferAI: boolean;
  onToggleAI: () => void;
}

export const SentenceOutput: React.FC<SentenceOutputProps> = ({
  translation,
  preferAI,
  onToggleAI,
}) => {
  const [isPlayingEn, setIsPlayingEn] = useState<boolean>(false);
  const [isPlayingHi, setIsPlayingHi] = useState<boolean>(false);

  const handleSpeak = async (text: string, lang: 'en-IN' | 'hi-IN') => {
    if (!text) return;
    if (lang === 'en-IN') {
      setIsPlayingEn(true);
      await webSpeechTts.speak(text, 'en-IN', 0.95, 1.0, () => setIsPlayingEn(false));
    } else {
      setIsPlayingHi(true);
      await webSpeechTts.speak(text, 'hi-IN', 0.95, 1.0, () => setIsPlayingHi(false));
    }
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <MessageSquareQuote className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            Translated Speech & Captions
          </h2>
        </div>

        {/* Engine Toggle (Rule-based vs Gemini AI) */}
        <div className="flex items-center space-x-2">
          <button
            id="grammar-engine-toggle"
            onClick={onToggleAI}
            className={`flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              preferAI
                ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            }`}
            title="Toggle between deterministic Rule Engine (instant, offline) and Gemini AI Translation"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {preferAI ? 'Mode: Gemini AI' : 'Mode: Rule Engine (Instant)'}
          </button>
        </div>
      </div>

      {/* Main Translation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* English Card */}
        <div className="flex flex-col justify-between bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              English (SVO Synthesized)
            </span>
            <button
              id="tts-play-english-btn"
              onClick={() => handleSpeak(translation?.english || '', 'en-IN')}
              disabled={!translation?.english}
              className={`p-1.5 rounded-md border transition-all ${
                isPlayingEn
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white disabled:opacity-40'
              }`}
              title="Speak English"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="min-h-[50px] flex items-center">
            {translation?.english ? (
              <p className="text-base font-semibold text-slate-100 leading-snug">
                "{translation.english}"
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Awaiting sign translation...
              </p>
            )}
          </div>
        </div>

        {/* Hindi Card */}
        <div className="flex flex-col justify-between bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Hindi (हिन्दी अनुवाद)
            </span>
            <button
              id="tts-play-hindi-btn"
              onClick={() => handleSpeak(translation?.hindi || '', 'hi-IN')}
              disabled={!translation?.hindi}
              className={`p-1.5 rounded-md border transition-all ${
                isPlayingHi
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white disabled:opacity-40'
              }`}
              title="Speak Hindi"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="min-h-[50px] flex items-center">
            {translation?.hindi ? (
              <p className="text-base font-semibold text-amber-200/90 font-serif leading-snug">
                "{translation.hindi}"
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">
                प्रतीक्षा की जा रही है...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grammar Transformation Explanation Note */}
      {translation?.grammarNote && (
        <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-lg p-2.5 flex items-start text-xs text-indigo-300/90">
          <Languages className="w-4 h-4 mr-2 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-semibold text-indigo-200">ISL Topic-Comment Transformation:</span>
            <span className="text-slate-400">{translation.grammarNote}</span>
          </div>
        </div>
      )}

      {/* Real-time High Contrast Caption Banner */}
      <div className="bg-black/90 border border-slate-800 rounded-lg px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            Live Caption:
          </span>
          <span className="text-sm font-medium text-white">
            {translation?.english || 'SignBridge listening...'}
          </span>
        </div>
        <div className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {translation?.engine?.includes('gemini') ? (
            <span className="text-indigo-400">Gemini AI</span>
          ) : translation?.engine ? (
            <span className="text-emerald-400">ISL Rule Engine (Rate-Free)</span>
          ) : (
            <span className="text-slate-500">Ready</span>
          )}
        </div>
      </div>
    </div>
  );
};
