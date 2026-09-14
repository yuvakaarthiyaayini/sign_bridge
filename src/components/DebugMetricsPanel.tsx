import React from 'react';
import { Gauge, ShieldCheck, Cpu, Sliders, Activity, CheckCircle2 } from 'lucide-react';
import { PipelinePerformance } from '../types';

interface DebugMetricsPanelProps {
  performance: PipelinePerformance;
  confidenceThreshold: number;
  onThresholdChange: (newVal: number) => void;
}

export const DebugMetricsPanel: React.FC<DebugMetricsPanelProps> = ({
  performance,
  confidenceThreshold,
  onThresholdChange,
}) => {
  const isWithinBudget = performance.totalLatencyMs <= 200;

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            Latency & Telemetry Inspector
          </h2>
        </div>

        {/* Target Latency Badge */}
        <div
          className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            isWithinBudget
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          {isWithinBudget ? '< 200ms Target Met' : 'Latency Exceeded'}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Latency */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col">
          <span className="text-[11px] font-medium text-slate-400">Total Latency</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span
              className={`text-xl font-bold tracking-tight ${
                isWithinBudget ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              {performance.totalLatencyMs}
            </span>
            <span className="text-xs text-slate-500">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Budget: 200ms</span>
        </div>

        {/* Landmark Extraction Latency */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col">
          <span className="text-[11px] font-medium text-slate-400">Landmark Time</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold text-slate-200">
              {performance.landmarkLatencyMs}
            </span>
            <span className="text-xs text-slate-500">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">3 MediaPipe Tasks</span>
        </div>

        {/* Classifier Latency */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col">
          <span className="text-[11px] font-medium text-slate-400">Classification</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold text-slate-200">
              {performance.classifierLatencyMs}
            </span>
            <span className="text-xs text-slate-500">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Sliding Window + Static</span>
        </div>

        {/* Rendering FPS */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col">
          <span className="text-[11px] font-medium text-slate-400">Video Rate</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold text-emerald-400">
              {performance.fps}
            </span>
            <span className="text-xs text-slate-500">fps</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">WebAssembly / WebGL</span>
        </div>
      </div>

      {/* Motion Energy & Active Landmarkers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Kinetic Energy Bar */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-300">Kinetic Motion Energy</span>
            <span className="text-xs font-mono text-cyan-400">
              {Math.round(performance.motionEnergy * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-150"
              style={{ width: `${Math.min(100, performance.motionEnergy * 500)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1.5">
            Gating threshold: &gt; 0.035 for dynamic sign segmentation
          </span>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-300 flex items-center">
              <Sliders className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              Confidence Filter Threshold
            </span>
            <span className="text-xs font-mono font-bold text-indigo-300">
              {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>
          <input
            id="confidence-threshold-slider"
            type="range"
            min="0.3"
            max="0.9"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-[10px] text-slate-500 mt-1.5">
            Signs below threshold trigger distinct "Unclear" alert
          </span>
        </div>
      </div>

      {/* Strict Privacy Assurance Box */}
      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-3 flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-emerald-300">
            Signer Privacy Guaranteed: Video Never Leaves Device
          </span>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
            Camera frames are processed in-memory directly in your browser using MediaPipe client-side WebAssembly.
            No video, photos, or raw pixel data are ever transmitted across the network or stored on any server.
          </p>
        </div>
      </div>
    </div>
  );
};
