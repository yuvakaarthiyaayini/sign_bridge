import React, { useState } from 'react';
import { X, BookOpen, Search, Info } from 'lucide-react';
import { ISL_VOCABULARY } from '../data/islVocabulary';
import { ISLSignDefinition } from '../types';

interface AlphabetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSign: (gloss: string) => void;
}

export const AlphabetGuideModal: React.FC<AlphabetGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectSign,
}) => {
  const [filter, setFilter] = useState<'All' | 'Alphabet' | 'Number' | 'Greeting' | 'Need/Emergency' | 'Question'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredSigns = ISL_VOCABULARY.filter((s) => {
    const matchesCategory = filter === 'All' || s.category === filter;
    const matchesSearch =
      s.gloss.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.englishMeaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.hindiMeaning.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Indian Sign Language (ISL) Vocabulary & Alphabet Guide
            </h3>
          </div>
          <button
            id="close-alphabet-guide-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Alphabet', 'Number', 'Greeting', 'Need/Emergency', 'Question'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === cat
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sign or meaning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-56"
            />
          </div>
        </div>

        {/* Vocabulary Grid */}
        <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredSigns.map((item) => (
            <div
              key={item.gloss}
              onClick={() => {
                onSelectSign(item.gloss);
                onClose();
              }}
              className="bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 flex flex-col justify-between cursor-pointer group transition-all hover:shadow-md hover:shadow-indigo-500/10"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {item.gloss}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.type === 'static'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {item.type === 'static' ? 'Fingerspell' : 'Dynamic'}
                  </span>
                </div>
                <div className="text-xs font-serif text-amber-200/80 mb-1">
                  {item.hindiMeaning}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-indigo-400/80 flex items-center justify-between">
                <span>{item.category}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-medium text-indigo-300">
                  Insert Sign →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Click any sign card to append it to the current ISL gloss sequence</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
