import React from 'react';
import { Delete, Trash2, ArrowRight, Plus, Sparkles, Layers } from 'lucide-react';
import { SignPrediction } from '../types';
import { ISL_VOCABULARY } from '../data/islVocabulary';

interface GlossStreamProps {
  glosses: string[];
  recentPredictions: SignPrediction[];
  onRemoveLast: () => void;
  onClear: () => void;
  onTranslate: () => void;
  onAddGloss: (gloss: string) => void;
  isTranslating: boolean;
  autoTranslateEnabled: boolean;
  onToggleAutoTranslate: () => void;
}

export const GlossStream: React.FC<GlossStreamProps> = ({
  glosses,
  recentPredictions,
  onRemoveLast,
  onClear,
  onTranslate,
  onAddGloss,
  isTranslating,
  autoTranslateEnabled,
  onToggleAutoTranslate,
}) => {
  // Quick pick dynamic sign shortcuts for rapid test composition
  const quickPicks = ['NAMASTE', 'THANK YOU', 'PLEASE', 'HELP', 'WATER', 'FOOD', 'YOU', 'NAME', 'WHAT', 'WHERE'];

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      {/* Top Header with Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            Recognized ISL Gloss Stream
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {glosses.length} {glosses.length === 1 ? 'sign' : 'signs'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Auto Translate Toggle */}
          <label className="flex items-center cursor-pointer select-none text-xs text-slate-400 hover:text-slate-200 mr-2">
            <input
              type="checkbox"
              checked={autoTranslateEnabled}
              onChange={onToggleAutoTranslate}
              className="mr-1.5 accent-indigo-600 rounded cursor-pointer"
            />
            Auto-Translate
          </label>

          {/* Delete Last */}
          <button
            id="gloss-backspace-btn"
            onClick={onRemoveLast}
            disabled={glosses.length === 0}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Remove last sign"
          >
            <Delete className="w-4 h-4" />
          </button>

          {/* Clear All */}
          <button
            id="gloss-clear-btn"
            onClick={onClear}
            disabled={glosses.length === 0}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Clear all signs"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Translate Button */}
          <button
            id="gloss-translate-btn"
            onClick={onTranslate}
            disabled={glosses.length === 0 || isTranslating}
            className="flex items-center px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isTranslating ? (
              <span className="flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Reordering...
              </span>
            ) : (
              <span className="flex items-center">
                <span>Translate Sentence</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Gloss Chips Container */}
      <div className="min-h-[70px] bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex flex-wrap items-center gap-2 mb-3">
        {glosses.length === 0 ? (
          <div className="w-full text-center py-3 text-xs text-slate-500 italic">
            Perform signs in front of the camera or click quick-add tokens below to build an ISL sequence...
          </div>
        ) : (
          glosses.map((gloss, idx) => {
            const isFingerspell = gloss.length === 1;
            return (
              <div
                key={`${gloss}-${idx}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all animate-in fade-in zoom-in-95 ${
                  isFingerspell
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                    : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                }`}
              >
                <span>{gloss}</span>
                <span className="text-[10px] font-normal opacity-60">
                  {isFingerspell ? 'Alpha' : 'ISL'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Pick Vocabulary Shortcut Strip */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-slate-400">Quick Test Signs:</span>
        <div className="flex flex-wrap gap-1.5">
          {quickPicks.map((word) => (
            <button
              key={word}
              onClick={() => onAddGloss(word)}
              className="flex items-center px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700/80 transition-colors"
            >
              <Plus className="w-3 h-3 mr-1 text-slate-400" />
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
