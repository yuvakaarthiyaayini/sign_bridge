import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Hand,
  Volume2,
  Settings,
  BookOpen,
  Cpu,
  ShieldCheck,
  Languages,
  Activity,
  Sparkles,
} from 'lucide-react';
import { WebcamLandmarkView } from './components/WebcamLandmarkView';
import { GlossStream } from './components/GlossStream';
import { SentenceOutput } from './components/SentenceOutput';
import { DebugMetricsPanel } from './components/DebugMetricsPanel';
import { AlphabetGuideModal } from './components/AlphabetGuideModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { glossReorderingService } from './services/glossReordering';
import { webSpeechTts } from './services/ttsService';
import { SignPrediction, TranslationResult, PipelinePerformance } from './types';

export default function App() {
  // State for recognized gloss stream
  const [glosses, setGlosses] = useState<string[]>([]);
  const [recentPredictions, setRecentPredictions] = useState<SignPrediction[]>([]);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [preferAI, setPreferAI] = useState<boolean>(false);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState<boolean>(true);

  // Confidence threshold
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.65);

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isArchOpen, setIsArchOpen] = useState<boolean>(false);

  // Performance telemetry
  const [performance, setPerformance] = useState<PipelinePerformance>({
    fps: 0,
    landmarkLatencyMs: 0,
    classifierLatencyMs: 0,
    totalLatencyMs: 0,
    motionEnergy: 0,
    activeLandmarkers: { hands: false, pose: false, face: false },
  });

  // Debouncing & auto-translation timer ref
  const restTimerRef = useRef<number | null>(null);
  const lastAddedSignRef = useRef<{ gloss: string; time: number } | null>(null);

  // Handler for detected signs from webcam or simulator
  const handleSignDetected = useCallback(
    (prediction: SignPrediction) => {
      setRecentPredictions((prev) => [prediction, ...prev.slice(0, 19)]);

      if (prediction.category === 'rest' || prediction.category === 'unclear') {
        return;
      }

      const now = Date.now();
      const last = lastAddedSignRef.current;

      // Avoid immediate duplicate insertion within 1.2s for identical glosses
      if (last && last.gloss === prediction.gloss && now - last.time < 1200) {
        return;
      }

      lastAddedSignRef.current = { gloss: prediction.gloss, time: now };

      setGlosses((prev) => {
        const next = [...prev, prediction.gloss];

        // Trigger auto-translate if enabled and sequence has signs
        // Uses ultra-fast client-side rule engine during continuous signing for zero API latency and zero rate-limit issues
        if (autoTranslateEnabled) {
          if (restTimerRef.current) clearTimeout(restTimerRef.current);
          restTimerRef.current = window.setTimeout(async () => {
            setIsTranslating(true);
            const result = await glossReorderingService.translateGlosses(next, false);
            setTranslation(result);
            setIsTranslating(false);

            // Auto-speak in English
            if (result.english) {
              webSpeechTts.speak(result.english, 'en-IN');
            }
          }, 1200);
        }

        return next;
      });
    },
    [autoTranslateEnabled]
  );

  // Manual Trigger: Reorder & Translate Glosses (respects preferAI toggle)
  const handleTranslate = useCallback(async () => {
    if (glosses.length === 0) return;
    setIsTranslating(true);
    const result = await glossReorderingService.translateGlosses(glosses, preferAI);
    setTranslation(result);
    setIsTranslating(false);

    // Speak English audio output
    if (result.english) {
      webSpeechTts.speak(result.english, 'en-IN');
    }
  }, [glosses, preferAI]);

  // Remove last sign
  const handleRemoveLast = useCallback(() => {
    setGlosses((prev) => prev.slice(0, prev.length - 1));
  }, []);

  // Clear all signs
  const handleClear = useCallback(() => {
    setGlosses([]);
    setTranslation(null);
    lastAddedSignRef.current = null;
    webSpeechTts.stop();
  }, []);

  // Add sign from shortcut or guide
  const handleAddGloss = useCallback((gloss: string) => {
    setGlosses((prev) => [...prev, gloss]);
  }, []);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearTimeout(restTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Global Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-tight">SignBridge</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ISL v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Real-Time Indian Sign Language &rarr; Speech & Captions
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Privacy Guarantee Badge */}
          <div className="hidden lg:flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Zero Video Upload (On-Device WASM)
          </div>

          {/* Alphabet Guide */}
          <button
            id="open-alphabet-guide-btn"
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            ISL Guide
          </button>

          {/* Architecture & Specs */}
          <button
            id="open-arch-specs-btn"
            onClick={() => setIsArchOpen(true)}
            className="flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Architecture & Specs
          </button>
        </div>
      </header>

      {/* Main Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Grid: Camera / Simulator on Left, Gloss & Translation on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Webcam & Skeletal Landmark Overlay (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <WebcamLandmarkView
              onSignDetected={handleSignDetected}
              onPerformanceUpdate={setPerformance}
              confidenceThreshold={confidenceThreshold}
            />

            {/* Quick Informational Pill */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs text-slate-400">
              <span className="flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Supports ISL Fingerspelling (A–Z, 1–9) & 23 Dynamic Words (Namaste, Water, Help...)
              </span>
              <span className="font-mono text-[11px] text-cyan-400">
                258-dim landmark tensor
              </span>
            </div>
          </div>

          {/* Right Column: Gloss Stream + Sentence Output (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* Live Recognized Gloss Stream */}
            <GlossStream
              glosses={glosses}
              recentPredictions={recentPredictions}
              onRemoveLast={handleRemoveLast}
              onClear={handleClear}
              onTranslate={handleTranslate}
              onAddGloss={handleAddGloss}
              isTranslating={isTranslating}
              autoTranslateEnabled={autoTranslateEnabled}
              onToggleAutoTranslate={() => setAutoTranslateEnabled(!autoTranslateEnabled)}
            />

            {/* Reordered Sentence & Audio Speech Output */}
            <SentenceOutput
              translation={translation}
              preferAI={preferAI}
              onToggleAI={() => setPreferAI(!preferAI)}
            />
          </div>
        </div>

        {/* Bottom Section: Latency, Telemetry & Privacy Inspector */}
        <div className="w-full">
          <DebugMetricsPanel
            performance={performance}
            confidenceThreshold={confidenceThreshold}
            onThresholdChange={setConfidenceThreshold}
          />
        </div>
      </main>

      {/* Modals */}
      <AlphabetGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectSign={handleAddGloss}
      />

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />
    </div>
  );
}
