
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Search, Loader2, Plus, X, Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { OnboardingStep, OnboardingData, Movie } from '../types';
import { MovieService } from '../services/movieService';

const GENRES = ['Sci-Fi', 'Romance', 'Horror', 'Comedy', 'Drama', 'Action', 'Indie', 'Thriller', 'Animation', 'Documentary'];

const ONBOARDING_STEPS: OnboardingStep[] = ['IDENTITY', 'PHOTO', 'GENRES', 'ANCHORS', 'FILTERS', 'SYNC'];

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('IDENTITY');
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Letterboxd Flow States
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [letterboxdError, setLetterboxdError] = useState<string | null>(null);

  const [trendingMovies, setTrendingMovies] = useState<Partial<Movie>[]>([]);
  const [searchResults, setSearchResults] = useState<Partial<Movie>[]>([]);
  const [selectedMoviesDetails, setSelectedMoviesDetails] = useState<Partial<Movie>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<OnboardingData>({
    name: '',
    photoFile: null,
    photoPreview: null,
    genres: [],
    masterpieces: [],
    filters: [],
    letterboxdUsername: '',
  });

  useEffect(() => {
    MovieService.getTrendingForOnboarding().then(setTrendingMovies).catch(() => setTrendingMovies([]));
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
      reader.onloadend = () => setData(prev => ({ ...prev, photoPreview: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const toggleGenre = (genre: string) => {
    setData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter(g => g !== genre) : [...prev.genres, genre]
    }));
  };

  const toggleMasterpiece = (movie: Partial<Movie>) => {
    if (!movie.id) return;
    const isSelected = data.masterpieces.includes(movie.id);
    if (isSelected) {
      setData(prev => ({ ...prev, masterpieces: prev.masterpieces.filter(m => m !== movie.id) }));
      setSelectedMoviesDetails(prev => prev.filter(m => m.id !== movie.id));
    } else {
      setData(prev => ({ ...prev, masterpieces: [...prev.masterpieces, movie.id!] }));
      setSelectedMoviesDetails(prev => [...prev, movie]);
    }
  };

  const handleConnectLetterboxd = async () => {
    if (!data.letterboxdUsername) return;
    setIsConnecting(true);
    setLetterboxdError(null);
    try {
      await MovieService.validateLetterboxdUser(data.letterboxdUsername);
      setIsConnected(true);
    } catch (e: any) {
      setLetterboxdError(e.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncDiary = async () => {
    if (!isConnected || !data.letterboxdUsername) return;
    setIsSyncing(true);
    setSyncProgress("Establishing connection...");
    try {
      const count = await MovieService.syncLetterboxdHistory(
        data.letterboxdUsername, 
        'onboarding_temp',
        (msg) => setSyncProgress(msg)
      );
      setSyncProgress(`Done! Found ${count} films.`);
      setTimeout(() => setSyncProgress(null), 3000);
    } catch (e: any) {
      setLetterboxdError("Sync failed. Check console for details.");
    } finally {
      setIsSyncing(false);
    }
  };

  const next = () => {
    const currentIndex = ONBOARDING_STEPS.indexOf(step);
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      setStep(ONBOARDING_STEPS[currentIndex + 1]);
    } else {
      onComplete(data);
    }
  };

  const isNextDisabled = () => {
    if (step === 'IDENTITY') return !data.name.trim();
    if (step === 'GENRES') return data.genres.length === 0;
    return false;
  };

  const displayMovies = searchInput.trim().length > 1 ? searchResults : trendingMovies;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col p-6 overflow-hidden select-none">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col h-full min-h-0">
        <div className="flex gap-2 mb-8 pt-4 shrink-0">
          {ONBOARDING_STEPS.map((s, idx) => (
            <div 
              key={s} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                idx <= ONBOARDING_STEPS.indexOf(step) ? 'bg-[#DE3151]' : 'bg-zinc-800'
              }`} 
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {step === 'IDENTITY' && (
              <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col justify-center">
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
              <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">Profile View</h2>
                <p className="text-zinc-400 mb-12 font-medium">A face to match the taste.</p>
                <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
                  <div className="w-48 h-48 rounded-[3rem] bg-zinc-900 border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#DE3151]">
                    {data.photoPreview ? <img src={data.photoPreview} className="w-full h-full object-cover" /> : <Camera className="w-12 h-12 text-zinc-600" />}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#DE3151] rounded-2xl flex items-center justify-center shadow-2xl text-white"><Plus className="w-6 h-6" /></div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              </motion.div>
            )}

            {step === 'GENRES' && (
              <motion.div key="genres" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col">
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">Vibe Check</h2>
                <div className="flex-1 overflow-y-auto no-scrollbar pb-4 grid grid-cols-2 gap-3">
                  {GENRES.map(g => (
                    <button key={g} onClick={() => toggleGenre(g)} className={`p-6 rounded-3xl border-2 transition-all text-left font-bold ${(data.genres).includes(g) ? 'bg-[#DE3151] border-[#DE3151] text-white shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>{g}</button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'ANCHORS' && (
              <motion.div key="anchors" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col">
                <h2 className="text-4xl font-black mb-1 text-white tracking-tight uppercase">Masterpieces</h2>
                <div className="shrink-0 mb-4 h-24">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {selectedMoviesDetails.map(m => (
                      <motion.button key={`shelf-${m.id}`} onClick={() => toggleMasterpiece(m)} className="relative shrink-0 w-12 aspect-[2/3] rounded-lg overflow-hidden border-2 border-[#DE3151]">
                        <img src={m.posterUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><X className="w-4 h-4 text-white" /></div>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div className="relative flex-1">
                   <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    <div className="grid grid-cols-3 gap-3">
                      {displayMovies.map(m => (
                        <button key={m.id} onClick={() => m.id && toggleMasterpiece(m)} className={`relative rounded-xl overflow-hidden aspect-[2/3] transition-all border-[3px] w-full block bg-zinc-900 ${m.id && (data.masterpieces).includes(m.id) ? 'border-[#DE3151] scale-[0.98]' : 'border-transparent opacity-60'}`}>
                          <img src={m.posterUrl} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'FILTERS' && (
              <motion.div key="filters" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col justify-center">
                 <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">Exclusions</h2>
                 <p className="text-zinc-400 mb-10 font-medium">What's off the table tonight?</p>
                 <div className="space-y-3">
                    {['No Gore', 'No B&W', 'No Subtitles', 'Under 2h'].map(f => (
                       <button 
                         key={f}
                         onClick={() => setData(prev => ({ 
                           ...prev, 
                           filters: prev.filters.includes(f) ? prev.filters.filter(i => i !== f) : [...prev.filters, f] 
                         }))}
                         className={`w-full p-6 rounded-3xl border-2 flex justify-between items-center font-bold ${data.filters.includes(f) ? 'bg-zinc-800 border-[#DE3151] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                       >
                         {f}
                         {data.filters.includes(f) && <Check className="w-5 h-5 text-[#DE3151]" />}
                       </button>
                    ))}
                 </div>
              </motion.div>
            )}

            {step === 'SYNC' && (
              <motion.div key="sync" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col">
                <h2 className="text-4xl font-black mb-2 text-white tracking-tight uppercase">External Sync</h2>
                <p className="text-zinc-400 mb-10 font-medium italic">Import your recent history from Letterboxd.</p>
                
                <div className="space-y-6">
                  <div className={`bg-zinc-900 p-6 rounded-[2.5rem] border transition-all ${isConnected ? 'border-green-500/50' : letterboxdError ? 'border-red-500/50' : 'border-zinc-800'}`}>
                    <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest block mb-4">Letterboxd Username</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="text"
                        value={data.letterboxdUsername}
                        disabled={isConnected || isConnecting}
                        onChange={(e) => {
                          setData(prev => ({ ...prev, letterboxdUsername: e.target.value }));
                          setLetterboxdError(null);
                        }}
                        placeholder="e.g. cinephile_99"
                        className="flex-1 bg-transparent border-b-2 border-zinc-800 focus:border-[#DE3151] py-3 text-xl font-black text-white outline-none transition-all placeholder:text-zinc-800 disabled:opacity-50"
                      />
                      {isConnected && <CheckCircle2 className="w-8 h-8 text-green-500" />}
                    </div>

                    {letterboxdError && (
                      <div className="mt-4 flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {letterboxdError}
                      </div>
                    )}
                  </div>

                  {!isConnected ? (
                    <button
                      onClick={handleConnectLetterboxd}
                      disabled={isConnecting || !data.letterboxdUsername}
                      className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-20 transition-all active:scale-95"
                    >
                      {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                      Connect Account
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2 p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Account Connected</span>
                      </div>
                      <button
                        onClick={handleSyncDiary}
                        disabled={isSyncing}
                        className="w-full bg-[#DE3151] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-[#DE3151]/20"
                      >
                        {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        {isSyncing ? 'Syncing...' : 'Sync History'}
                      </button>
                      {syncProgress && (
                        <p className="text-[10px] font-bold text-[#DE3151] uppercase tracking-[0.2em] text-center animate-pulse">
                          {syncProgress}
                        </p>
                      )}
                      <button 
                        onClick={() => { setIsConnected(false); setData(prev => ({ ...prev, letterboxdUsername: '' })); }}
                        className="w-full text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white"
                      >
                        Change Account
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pb-8 pt-4 shrink-0">
          <button 
            onClick={next}
            disabled={isNextDisabled()}
            className="w-full bg-[#DE3151] text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-20"
          >
            {step === 'SYNC' ? 'Finish Setup' : 'Continue'}
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
