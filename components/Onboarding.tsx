import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Upload, Search, X, Plus } from 'lucide-react';
import { OnboardingStep, OnboardingData, Movie } from '../types';
import { MovieService } from '../services/movieService';

const GENRES = ['Sci-Fi', 'Romance', 'Horror', 'Comedy', 'Drama', 'Action', 'Indie', 'Thriller', 'Animation', 'Documentary'];
const FILTERS = [
  { id: 'gore', label: 'No Extreme Gore', icon: '🩸' },
  { id: 'old', label: 'No B&W / Pre-1970', icon: '🎞️' },
  { id: 'subtitles', label: 'No Subtitles', icon: '🗨️' },
  { id: 'long', label: 'Nothing Over 2.5h', icon: '⏳' }
];

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('GENRES');
  const [searchInput, setSearchInput] = useState('');
  const [trendingMovies, setTrendingMovies] = useState<Partial<Movie>[]>([]);
  const [data, setData] = useState<OnboardingData>({
    genres: [],
    masterpieces: [],
    filters: []
  });

  useEffect(() => {
    const load = async () => {
      try {
        const movies = await MovieService.getTrendingForOnboarding();
        setTrendingMovies(movies || []);
      } catch (e) {
        console.error("Onboarding load error", e);
        setTrendingMovies([]);
      }
    };
    load();
  }, []);

  const toggleGenre = (genre: string) => {
    setData(prev => ({
      ...prev,
      genres: (prev.genres || []).includes(genre) 
        ? prev.genres.filter(g => g !== genre) 
        : [...(prev.genres || []), genre]
    }));
  };

  const toggleMasterpiece = (id: string) => {
    if (!id) return;
    setData(prev => ({
      ...prev,
      masterpieces: (prev.masterpieces || []).includes(id) 
        ? prev.masterpieces.filter(m => m !== id) 
        : [...(prev.masterpieces || []), id]
    }));
  };

  const handleManualAdd = () => {
    if (searchInput.trim()) {
      toggleMasterpiece(`manual-${searchInput}`);
      setSearchInput('');
    }
  };

  const toggleFilter = (id: string) => {
    setData(prev => ({
      ...prev,
      filters: (prev.filters || []).includes(id) 
        ? prev.filters.filter(f => f !== id) 
        : [...(prev.filters || []), id]
    }));
  };

  const next = () => {
    if (step === 'GENRES') setStep('ANCHORS');
    else if (step === 'ANCHORS') setStep('FILTERS');
    else if (step === 'FILTERS') setStep('LETTERBOXD');
    else onComplete(data);
  };

  // Safe fallback for slice and map
  const displayTrending = (trendingMovies || []).slice(0, 12);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col p-6 overflow-hidden select-none">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col h-full min-h-0">
        <div className="flex gap-2 mb-8 pt-4 shrink-0">
          {['GENRES', 'ANCHORS', 'FILTERS', 'LETTERBOXD'].map((s, idx) => (
            <div 
              key={s} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                idx <= ['GENRES', 'ANCHORS', 'FILTERS', 'LETTERBOXD'].indexOf(step) ? 'bg-[#DE3151]' : 'bg-zinc-800'
              }`} 
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {step === 'GENRES' && (
              <motion.div 
                key="genres"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col"
              >
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight">Vibe Check</h2>
                <p className="text-zinc-400 mb-8 font-medium">What kind of stories do you seek?</p>
                <div className="flex-1 overflow-y-auto no-scrollbar pb-4 grid grid-cols-2 gap-3">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={`p-6 rounded-3xl border-2 transition-all text-left font-bold ${
                        (data.genres || []).includes(g) ? 'bg-[#DE3151] border-[#DE3151] text-white shadow-lg shadow-[#DE3151]/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'ANCHORS' && (
              <motion.div 
                key="anchors"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col"
              >
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight">Your Hall of Fame</h2>
                <p className="text-zinc-400 mb-6 font-medium">Select or search for films you adore.</p>
                
                <div className="flex gap-2 mb-6 shrink-0 h-14">
                  <div className="relative flex-1 h-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                    <input 
                      type="text" 
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                      placeholder="Type any film title..." 
                      className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 focus:ring-2 focus:ring-[#DE3151] outline-none transition-all text-white font-medium"
                    />
                  </div>
                  <button 
                    onClick={handleManualAdd}
                    className="bg-zinc-800 w-14 h-14 shrink-0 rounded-2xl text-[#DE3151] flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                  <div className="grid grid-cols-3 gap-3">
                    {displayTrending.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => m.id && toggleMasterpiece(m.id)}
                        className={`relative rounded-xl overflow-hidden aspect-[2/3] transition-all border-[3px] w-full block ${
                          m.id && (data.masterpieces || []).includes(m.id) 
                            ? 'border-[#DE3151] scale-[0.98] shadow-lg shadow-[#DE3151]/20 opacity-100' 
                            : 'border-transparent opacity-60 hover:opacity-100 scale-100'
                        }`}
                      >
                        <img src={m.posterUrl} className="w-full h-full object-cover pointer-events-none" alt={m.title} />
                        {m.id && (data.masterpieces || []).includes(m.id) && (
                          <div className="absolute inset-0 bg-[#DE3151]/20 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="bg-white rounded-full p-1 shadow-lg">
                              <Check className="w-4 h-4 text-[#DE3151]" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'FILTERS' && (
              <motion.div 
                key="filters"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col"
              >
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight">Strict No's</h2>
                <p className="text-zinc-400 mb-10 font-medium">Films that usually get a 'skip' from you.</p>
                
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                  {FILTERS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => toggleFilter(f.id)}
                      className={`w-full flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${
                        (data.filters || []).includes(f.id) ? 'bg-[#DE3151]/10 border-[#DE3151] text-[#DE3151]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        <span className="text-3xl">{f.icon}</span>
                        <span className="font-bold text-lg">{f.label}</span>
                      </div>
                      {(data.filters || []).includes(f.id) && <Check className="w-6 h-6" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'LETTERBOXD' && (
              <motion.div 
                key="letterboxd"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col justify-center text-center"
              >
                <div className="bg-zinc-900/50 p-12 rounded-[3rem] border-4 border-dashed border-zinc-800 flex flex-col items-center gap-6 hover:border-[#DE3151] transition-colors group cursor-pointer">
                  <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                    <Upload className="w-10 h-10 text-[#DE3151]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">Sync Watched List</h3>
                    <p className="text-zinc-500 text-sm max-w-[200px] mx-auto leading-relaxed">Drop your Letterboxd screenshot to avoid repeats.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pb-8 pt-4 shrink-0">
          <button 
            onClick={next}
            disabled={(step === 'GENRES' && (data.genres || []).length === 0)}
            className="w-full bg-[#DE3151] text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-2xl shadow-[#DE3151]/30 disabled:opacity-20 disabled:grayscale"
          >
            {step === 'LETTERBOXD' ? 'Start Matching' : 'Continue'}
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;