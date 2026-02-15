
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Loader2, Sparkles, Brain, Info, Zap, X, AlertTriangle, Cloud } from 'lucide-react';
import { Movie, InteractionType, DiscoveryFilters, CurationMethod } from '../types';
import { MovieService } from '../services/movieService';
import MovieCard from './MovieCard';
import TrailerModal from './TrailerModal';
import FilterDrawer from './FilterDrawer';

interface DiscoverSectionProps {
  userId: string;
  onInteraction?: (movieId: string, type: InteractionType) => void;
}

const DiscoverSection: React.FC<DiscoverSectionProps> = ({ userId, onInteraction }) => {
  const [queue, setQueue] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [curationMethod, setCurationMethod] = useState<CurationMethod>(CurationMethod.TRENDING);
  const [curationNote, setCurationNote] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [exitDirection, setExitDirection] = useState<{ x: number; y: number; rotate: number }>({ x: 0, y: 0, rotate: 0 });
  const [filters, setFilters] = useState<DiscoveryFilters>({
    genre: '',
    mood: '',
    maxRuntime: 120,
    wildcard: false
  });

  const loadMovies = useCallback(async (isInitial: boolean = true, currentFilters?: DiscoveryFilters) => {
    if (isInitial) {
      setIsLoading(true);
      setCurrentIndex(0);
      setNextPage(1);
      setQueue([]);
    } else {
      if (isFetchingMore) return;
      setIsFetchingMore(true);
    }

    try {
      const activeFilters = currentFilters || filters;
      const pageToFetch = isInitial ? 1 : nextPage;
      const result = await MovieService.getDiscoverQueue(userId, pageToFetch, activeFilters);
      
      const displayQueue = (result.movies || []).filter(m => m && m.id);
      
      setQueue(prev => isInitial ? displayQueue : [...prev, ...displayQueue]);
      setNextPage(result.nextPage);
      setCurationMethod(result.method);
      setCurationNote(result.note || null);
      
      if (isInitial) {
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 6000);
      }
    } catch (e) {
      console.error("Discover load error", e);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [nextPage, userId, filters, isFetchingMore]);

  useEffect(() => {
    loadMovies(true);
  }, []);

  const handleApplyFilters = (newFilters: DiscoveryFilters) => {
    setFilters(newFilters);
    setIsFilterOpen(false);
    loadMovies(true, newFilters);
  };

  useEffect(() => {
    if (!isLoading && !isFetchingMore && queue.length > 0) {
      const itemsLeft = queue.length - currentIndex;
      if (itemsLeft < 10) {
        loadMovies(false);
      }
    }
  }, [currentIndex, queue.length, isLoading, isFetchingMore, loadMovies]);

  const handleSwipe = async (type: InteractionType) => {
    const currentQueue = queue || [];
    if (currentIndex >= currentQueue.length) return;

    if (type === InteractionType.YES) {
      setExitDirection({ x: 1000, y: 0, rotate: 20 });
    } else if (type === InteractionType.NO) {
      setExitDirection({ x: -1000, y: 0, rotate: -20 });
    } else if (type === InteractionType.WATCHED) {
      setExitDirection({ x: 0, y: -1000, rotate: 0 });
    }

    const currentMovie = currentQueue[currentIndex];
    if (currentMovie && currentMovie.id) {
      const safeMovieId = String(currentMovie.id);
      
      await MovieService.submitInteraction({
        userId: userId,
        movieId: safeMovieId,
        title: currentMovie.title,
        posterUrl: currentMovie.posterUrl,
        type,
        timestamp: Date.now()
      });
      if (onInteraction) onInteraction(safeMovieId, type);
    }

    setCurrentIndex(prev => prev + 1);
  };

  if (isLoading && queue.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center space-y-8"
        >
          <div className="relative w-32 h-32">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="absolute inset-0 border-2 border-[#DE3151] border-t-transparent rounded-full shadow-[0_0_20px_rgba(222,49,81,0.2)]"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute inset-3 border-2 border-zinc-800 border-b-transparent rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-8 h-8 text-[#DE3151] animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-white font-black text-2xl tracking-tighter uppercase mb-2">Engaging Cinema Muse</h3>
            <p className="text-zinc-600 font-bold uppercase tracking-[0.4em] text-[10px] max-w-[240px] leading-loose">
              Synchronizing direction with Gemini 3 Intelligence
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQueue = queue || [];
  const isEmpty = currentIndex >= currentQueue.length;

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto relative px-4 pb-32 pt-1">
      <div className="flex justify-between items-center mb-4 px-4">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Discover</h2>
            {isFetchingMore && <Loader2 className="w-3 h-3 text-[#DE3151] animate-spin" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5" onClick={() => setShowStatus(!showStatus)}>
            {curationMethod === CurationMethod.AI_TAILORED ? (
              <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
            ) : (
              <Cloud className="w-2.5 h-2.5 text-zinc-600" />
            )}
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
              {curationMethod === CurationMethod.AI_TAILORED ? 'Gemini Active' : 'Fallback Engine'}
            </span>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsFilterOpen(true)}
          className="w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-[#DE3151] hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="relative flex-1">
        <AnimatePresence>
          {showStatus && curationNote && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`absolute top-0 left-4 right-4 z-[100] border p-5 rounded-[2rem] backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ${
                curationMethod === CurationMethod.AI_TAILORED 
                ? 'bg-zinc-950/90 border-[#DE3151]/30 ring-1 ring-[#DE3151]/20' 
                : 'bg-zinc-950/95 border-amber-500/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                  curationMethod === CurationMethod.AI_TAILORED 
                  ? 'bg-[#DE3151]/10 text-[#DE3151]' 
                  : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {curationMethod === CurationMethod.AI_TAILORED ? <Sparkles className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                      curationMethod === CurationMethod.AI_TAILORED ? 'text-white' : 'text-amber-500'
                    }`}>
                      {curationMethod === CurationMethod.AI_TAILORED ? 'Cinema Muse Engine' : 'Engine Fallback'}
                    </h4>
                    {curationMethod === CurationMethod.AI_TAILORED && (
                      <div className="px-1.5 py-0.5 bg-zinc-800 rounded-md text-[7px] font-black text-zinc-400 tracking-tighter uppercase">Gemini 3</div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 leading-relaxed italic pr-4">
                    {curationNote}
                  </p>
                </div>
                <button onClick={() => setShowStatus(false)} className="text-zinc-700 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 bg-zinc-900/40 rounded-[1.5rem] border border-dashed border-zinc-800"
            >
              <div className="w-20 h-20 bg-zinc-900 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-2xl mb-6">🍿</div>
              <div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase">Roll Credits</h2>
                <p className="text-zinc-500 font-medium mb-10 leading-relaxed text-sm">That's the end of today's reel. Ready for another take?</p>
              </div>
              <button 
                onClick={() => loadMovies(true)}
                className="w-full bg-[#DE3151] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-[#DE3151]/20 hover:brightness-110 active:scale-95 transition-all"
              >
                Reload Feed
              </button>
            </motion.div>
          ) : (
            currentQueue[currentIndex] && (
              <motion.div
                key={currentQueue[currentIndex].id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ 
                  x: exitDirection.x, 
                  y: exitDirection.y, 
                  rotate: exitDirection.rotate, 
                  opacity: 0,
                  transition: { duration: 0.4, ease: "easeIn" } 
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0"
              >
                <MovieCard 
                  movie={currentQueue[currentIndex]}
                  isTop={true}
                  onAction={handleSwipe}
                  onWatchTrailer={() => setTrailerMovie(currentQueue[currentIndex])}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      <TrailerModal 
        isOpen={!!trailerMovie} 
        onClose={() => setTrailerMovie(null)} 
        title={trailerMovie?.title || ''} 
        movieId={trailerMovie?.id}
      />

      <FilterDrawer 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)} 
        currentFilters={filters}
        onApply={handleApplyFilters}
      />
    </div>
  );
};

export default DiscoverSection;
