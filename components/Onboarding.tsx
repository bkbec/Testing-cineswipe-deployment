
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Upload, Search, Loader2, Plus, X } from 'lucide-react';
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
  const [isSearching, setIsSearching] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState<Partial<Movie>[]>([]);
  const [searchResults, setSearchResults] = useState<Partial<Movie>[]>([]);
  const [selectedMoviesDetails, setSelectedMoviesDetails] = useState<Partial<Movie>[]>([]);
  const [data, setData] = useState<OnboardingData>({
    genres: [],
    masterpieces: [],
    filters: []
  });

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const movies = await MovieService.getTrendingForOnboarding();
        setTrendingMovies(movies || []);
      } catch (e) {
        console.error("Onboarding trending load error", e);
        setTrendingMovies([]);
      }
    };
    loadTrending();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchInput.trim().length > 1) {
        setIsSearching(true);
        try {
          const results = await MovieService.searchMovies(searchInput);
          setSearchResults(results || []);
        } catch (e) {
          console.error("Search failed", e);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleGenre = (genre: string) => {
    setData(prev => ({
      ...prev,
      genres: (prev.genres || []).includes(genre) 
        ? prev.genres.filter(g => g !== genre) 
        : [...(prev.genres || []), genre]
    }));
  };

  const toggleMasterpiece = (movie: Partial<Movie>) => {
    if (!movie.id) return;
    const isSelected = (data.masterpieces || []).includes(movie.id);
    
    if (isSelected) {
      setData(prev => ({
        ...prev,
        masterpieces: prev.masterpieces.filter(m => m !== movie.id)
      }));
      setSelectedMoviesDetails(prev => prev.filter(m => m.id !== movie.id));
    } else {
      setData(prev => ({
        ...prev,
        masterpieces: [...(prev.masterpieces || []), movie.id!]
      }));
      setSelectedMoviesDetails(prev => [...prev, movie]);
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

  const displayMovies = searchInput.trim().length > 1 ? searchResults : trendingMovies;

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
                <p className="text-zinc-400 mb-6 font-medium">Select films you adore to seed your taste.</p>
                
                <div className="flex gap-2 mb-4 shrink-0 h-14">
                  <div className="relative flex-1 h-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-[#DE3151]" /> : <Search className="w-4 h-4" />}
                    </div>
                    <input 
                      type="text" 
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search for movies..." 
                      className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 focus:ring-2 focus:ring-[#DE3151] outline-none transition-all text-white font-medium placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {/* Selected Movies List */}
                {selectedMoviesDetails.length > 0 && (
                  <div className="mb-6 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Selected ({selectedMoviesDetails.length})</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                      <AnimatePresence>
                        {selectedMoviesDetails.map(m => (
                          <motion.div 
                            key={m.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="relative flex-shrink-0 w-20 aspect-[2/3] rounded-xl overflow-hidden border-2 border-[#DE3151] group shadow-lg shadow-[#DE3151]/10"
                          >
                            <img src={m.posterUrl} className="w-full h-full object-cover" alt={m.title} />
                            <button 
                               onClick={() => toggleMasterpiece(m)}
                               className="absolute top-1 right-1 bg-[#DE3151] rounded-full p-1 shadow-lg active:scale-90 transition-transform"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                  {displayMovies.length === 0 && !isSearching ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                      <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center text-3xl mb-4 grayscale opacity-40">🎬</div>
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No results found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {displayMovies.map(m => (
                        <button 
                          key={m.id}
                          onClick={() => m.id && toggleMasterpiece(m)}
                          className={`relative rounded-xl overflow-hidden aspect-[2/3] transition-all border-[3px] w-full block bg-zinc-900 ${
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
                  )}
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
