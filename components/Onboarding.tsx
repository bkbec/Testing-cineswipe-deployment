
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Upload, Search, Loader2, Plus, X, Camera, Scan, Trash2 } from 'lucide-react';
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
  const [step, setStep] = useState<OnboardingStep>('IDENTITY');
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState<Partial<Movie>[]>([]);
  const [searchResults, setSearchResults] = useState<Partial<Movie>[]>([]);
  const [selectedMoviesDetails, setSelectedMoviesDetails] = useState<Partial<Movie>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<OnboardingData>({
    name: '',
    photoFile: null,
    photoPreview: null,
    genres: [],
    masterpieces: [],
    filters: [],
    detectedWatchedMovies: []
  });

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const movies = await MovieService.getTrendingForOnboarding();
        setTrendingMovies(movies || []);
      } catch (e) {
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData(prev => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({ ...prev, photoPreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScreenshotSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanning(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const detected = await MovieService.syncWatchedListFromImage(base64);
        setData(prev => ({
          ...prev,
          detectedWatchedMovies: [...(prev.detectedWatchedMovies || []), ...detected]
        }));
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDetectedMovie = (id: string) => {
    setData(prev => ({
      ...prev,
      detectedWatchedMovies: (prev.detectedWatchedMovies || []).filter(m => m.id !== id)
    }));
  };

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
    const steps: OnboardingStep[] = ['IDENTITY', 'PHOTO', 'GENRES', 'ANCHORS', 'FILTERS', 'LETTERBOXD'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      onComplete(data);
    }
  };

  const isNextDisabled = () => {
    if (step === 'IDENTITY') return !data.name.trim();
    if (step === 'GENRES') return (data.genres || []).length === 0;
    return false;
  };

  const displayMovies = searchInput.trim().length > 1 ? searchResults : trendingMovies;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col p-6 overflow-hidden select-none">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col h-full min-h-0">
        <div className="flex gap-2 mb-8 pt-4 shrink-0">
          {['IDENTITY', 'PHOTO', 'GENRES', 'ANCHORS', 'FILTERS', 'LETTERBOXD'].map((s, idx) => (
            <div 
              key={s} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                idx <= ['IDENTITY', 'PHOTO', 'GENRES', 'ANCHORS', 'FILTERS', 'LETTERBOXD'].indexOf(step) ? 'bg-[#DE3151]' : 'bg-zinc-800'
              }`} 
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {step === 'IDENTITY' && (
              <motion.div 
                key="identity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col justify-center"
              >
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">Identity</h2>
                <p className="text-zinc-400 mb-10 font-medium">What should we call you, cinephile?</p>
                <input 
                  autoFocus
                  type="text"
                  value={data.name}
                  onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && !isNextDisabled() && next()}
                  placeholder="Enter your name..."
                  className="w-full bg-transparent border-b-4 border-zinc-800 focus:border-[#DE3151] py-6 text-4xl font-black text-white outline-none transition-all placeholder:text-zinc-900"
                />
              </motion.div>
            )}

            {step === 'PHOTO' && (
              <motion.div 
                key="photo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center"
              >
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">Profile View</h2>
                <p className="text-zinc-400 mb-12 font-medium">A face to match the taste.</p>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="w-48 h-48 rounded-[3rem] bg-zinc-900 border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#DE3151] group-hover:bg-zinc-800">
                    {data.photoPreview ? (
                      <img src={data.photoPreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-zinc-600 group-hover:text-[#DE3151]">
                        <Camera className="w-12 h-12" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Upload Photo</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#DE3151] rounded-2xl flex items-center justify-center shadow-2xl text-white">
                    <Plus className="w-6 h-6" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              </motion.div>
            )}

            {step === 'GENRES' && (
              <motion.div 
                key="genres"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col"
              >
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">Vibe Check</h2>
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
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">Masterpieces</h2>
                <p className="text-zinc-400 mb-6 font-medium">Select films you adore.</p>
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
                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                  <div className="grid grid-cols-3 gap-3">
                    {displayMovies.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => m.id && toggleMasterpiece(m)}
                        className={`relative rounded-xl overflow-hidden aspect-[2/3] transition-all border-[3px] w-full block bg-zinc-900 ${
                          m.id && (data.masterpieces || []).includes(m.id) 
                            ? 'border-[#DE3151] scale-[0.98] shadow-lg shadow-[#DE3151]/20' 
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={m.posterUrl} className="w-full h-full object-cover" alt={m.title} />
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
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">Strict No's</h2>
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
                className="absolute inset-0 flex flex-col"
              >
                <div className="shrink-0 mb-8">
                  <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">History Sync</h2>
                  <p className="text-zinc-400 font-medium leading-relaxed">AI scans your screenshots to avoid showing movies you've already seen.</p>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-[3rem] border-2 border-[#DE3151]/30 relative overflow-hidden">
                       <motion.div 
                         initial={{ top: '0%' }}
                         animate={{ top: '100%' }}
                         transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                         className="absolute left-0 right-0 h-1 bg-[#DE3151] shadow-[0_0_20px_#DE3151] z-10"
                       />
                       <Loader2 className="w-12 h-12 text-[#DE3151] animate-spin mb-6" />
                       <h3 className="text-xl font-black text-white uppercase tracking-tighter">AI Scanning...</h3>
                       <p className="text-zinc-500 text-xs font-medium uppercase tracking-[0.2em] mt-2">Identifying movie posters</p>
                    </div>
                  ) : (data.detectedWatchedMovies || []).length > 0 ? (
                    <div className="space-y-6 pb-10">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Detected ({data.detectedWatchedMovies?.length})</span>
                          <button 
                            onClick={() => screenshotInputRef.current?.click()}
                            className="text-[10px] font-black uppercase text-[#DE3151] tracking-widest flex items-center gap-2"
                          >
                             <Plus className="w-3 h-3" /> Add More
                          </button>
                       </div>
                       <div className="grid grid-cols-3 gap-3">
                         {data.detectedWatchedMovies?.map(m => (
                           <div key={m.id} className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 group shadow-xl">
                              <img src={m.posterUrl} className="w-full h-full object-cover grayscale" />
                              <button 
                                onClick={() => m.id && removeDetectedMovie(m.id)}
                                className="absolute top-1 right-1 bg-black/80 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                           </div>
                         ))}
                       </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => screenshotInputRef.current?.click()}
                      className="bg-zinc-900/50 p-12 rounded-[3rem] border-4 border-dashed border-zinc-800 flex flex-col items-center gap-6 hover:border-[#DE3151] transition-colors group cursor-pointer"
                    >
                      <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                        <Scan className="w-10 h-10 text-[#DE3151]" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-black text-white mb-2">Sync Watched List</h3>
                        <p className="text-zinc-500 text-sm max-w-[200px] mx-auto leading-relaxed italic">Upload a screenshot of your movie posters or Letterboxd list.</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <input 
                  type="file" 
                  ref={screenshotInputRef} 
                  onChange={handleScreenshotSync} 
                  accept="image/*" 
                  className="hidden" 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pb-8 pt-4 shrink-0">
          <button 
            onClick={next}
            disabled={isNextDisabled() || isScanning}
            className="w-full bg-[#DE3151] text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-2xl shadow-[#DE3151]/30 disabled:opacity-20 disabled:grayscale"
          >
            {isScanning ? 'Processing...' : step === 'LETTERBOXD' ? 'Finish Setup' : 'Continue'}
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
