
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, SlidersHorizontal, Sparkles, X, ChevronDown } from 'lucide-react';
import { DiscoveryFilters } from '../types';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: DiscoveryFilters;
  onApply?: (filters: DiscoveryFilters) => void;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose, currentFilters, onApply }) => {
  const [localFilters, setLocalFilters] = useState<DiscoveryFilters>(currentFilters || {
    genre: '',
    mood: '',
    maxRuntime: 120,
    wildcard: false
  });

  const handleApply = () => {
    if (onApply) onApply({ ...localFilters, wildcard: false });
  };

  const handleSurprise = () => {
    if (onApply) onApply({ ...localFilters, wildcard: true });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={onClose}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[110] bg-zinc-950 border-t border-white/5 rounded-t-[3rem] p-10 max-w-md mx-auto shadow-[0_-20px_60px_rgba(222,49,81,0.15)] overflow-y-auto max-h-[90vh] no-scrollbar"
          >
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full mx-auto mb-10" />
            
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-white tracking-tight">Refine Taste</h3>
              <button onPointerDown={onClose} className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 active:scale-90 transition-colors hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Voice Note Section */}
              <button 
                onPointerDown={() => alert("Listening for voice commands...")}
                className="w-full flex items-center gap-6 p-6 bg-zinc-900/50 hover:bg-[#DE3151]/10 rounded-[2rem] border border-zinc-800 hover:border-[#DE3151]/40 transition-all group active:scale-[0.98]"
              >
                <div className="w-16 h-16 bg-[#DE3151] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#DE3151]/20 group-hover:scale-110 transition-transform">
                  <Mic className="w-8 h-8" />
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-black text-white text-lg">Voice AI Discovery</h4>
                  <p className="text-xs text-zinc-500 font-medium italic">"Find me a cozy indie dramedy..."</p>
                </div>
              </button>

              {/* Manual Filters Dropdowns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 p-5 rounded-[1.5rem] border border-zinc-800 flex flex-col gap-2 group hover:border-zinc-700 transition-colors">
                  <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-2">Genre <ChevronDown className="w-3 h-3 text-[#DE3151]" /></label>
                  <select 
                    value={localFilters.genre}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, genre: e.target.value }))}
                    className="w-full bg-transparent text-sm font-black text-white outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="">Any Genre</option>
                    <option value="Action">Action</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Documentary">Documentary</option>
                    <option value="Drama">Drama</option>
                    <option value="Fantasy">Fantasy</option>
                    <option value="Horror">Horror</option>
                    <option value="Romance">Romance</option>
                    <option value="Science Fiction">Sci-Fi</option>
                    <option value="Thriller">Thriller</option>
                  </select>
                </div>
                <div className="bg-zinc-900 p-5 rounded-[1.5rem] border border-zinc-800 flex flex-col gap-2 group hover:border-zinc-700 transition-colors">
                  <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-2">Mood <ChevronDown className="w-3 h-3 text-[#DE3151]" /></label>
                  <select 
                    value={localFilters.mood}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, mood: e.target.value }))}
                    className="w-full bg-transparent text-sm font-black text-white outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="">Any Mood</option>
                    <option value="Heartwarming">Heartwarming</option>
                    <option value="Intense">Intense</option>
                    <option value="Mind-bending">Mind-bending</option>
                    <option value="Dark">Dark & Gritty</option>
                    <option value="Romantic">Romantic</option>
                    <option value="Feel-Good">Feel-Good</option>
                  </select>
                </div>
              </div>

              <div className="bg-zinc-900 p-5 rounded-[1.5rem] border border-zinc-800 flex flex-col gap-2 group hover:border-zinc-700 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Max Runtime</label>
                  <span className="text-[10px] font-black text-[#DE3151] uppercase tracking-widest">Under {localFilters.maxRuntime}m</span>
                </div>
                <div className="flex items-center justify-between">
                  <input 
                    type="range" 
                    className="accent-[#DE3151] w-full cursor-pointer" 
                    min="60" 
                    max="240" 
                    step="15" 
                    value={localFilters.maxRuntime} 
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, maxRuntime: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleApply}
                  className="w-full py-5 bg-zinc-100 text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  Apply Filters
                </button>
                <button 
                  onPointerDown={handleSurprise}
                  className="w-full py-6 bg-gradient-to-r from-[#DE3151] to-[#FF5E62] text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:brightness-110 shadow-2xl shadow-[#DE3151]/20 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-6 h-6 animate-pulse" />
                  Surprise Me (AI Wildcard)
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterDrawer;
