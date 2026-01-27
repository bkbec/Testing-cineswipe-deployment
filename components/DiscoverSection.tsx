import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { Movie, InteractionType } from '../types';
import { MovieService } from '../services/movieService';
import MovieCard from './MovieCard';
import TrailerModal from './TrailerModal';
import FilterDrawer from './FilterDrawer';

interface DiscoverSectionProps {
  onInteraction?: () => void;
}

const DiscoverSection: React.FC<DiscoverSectionProps> = ({ onInteraction }) => {
  const [queue, setQueue] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [exitDirection, setExitDirection] = useState<{ x: number; y: number; rotate: number }>({ x: 0, y: 0, rotate: 0 });

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    setIsLoading(true);
    try {
      const movies = await MovieService.getDiscoverQueue('local-user');
      // Fix: Ensure movies is an array and filter out nulls or duplicates
      const displayQueue = (movies || []).filter(m => m && m.id);
      setQueue(displayQueue);
      setCurrentIndex(0);
    } catch (e) {
      console.error("Discover load error", e);
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (type: InteractionType) => {
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
      await MovieService.submitInteraction({
        userId: 'local-user',
        movieId: currentMovie.id,
        type,
        timestamp: Date.now()
      });
      if (onInteraction) onInteraction();
    }

    setCurrentIndex(prev => prev + 1);
  };

  // Guard Clause for Loading State
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-[#DE3151]/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-[#DE3151] border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="mt-8 text-[#DE3151] font-black uppercase tracking-[0.5em] text-[10px]">Scanning for Movies...</p>
      </div>
    );
  }

  const currentQueue = queue || [];
  const isEmpty = currentIndex >= currentQueue.length;

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto relative px-4 pb-32 pt-1">
      <div className="flex justify-between items-center mb-4 px-4">
        <div>
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-0.5 block">Your Feed</span>
          <h2 className="text-xl font-black text-white tracking-tighter">Discover</h2>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsFilterOpen(true)}
          className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-[1.2rem] flex items-center justify-center text-[#DE3151] hover:bg-zinc-800 hover:border-[#DE3151]/30 transition-all shadow-xl active:scale-95"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 bg-zinc-900/40 rounded-[1.5rem] border border-dashed border-zinc-800"
            >
              <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl mb-8">🍿</div>
              <div>
                <h2 className="text-3xl font-black text-white mb-3">Roll Credits</h2>
                <p className="text-zinc-500 font-medium mb-10 leading-relaxed">You've reached the end of today's queue. Ready for more?</p>
              </div>
              <button 
                onClick={loadMovies}
                className="w-full bg-[#DE3151] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-[#DE3151]/30 hover:brightness-110 active:scale-95 transition-all"
              >
                Reload Feed
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={currentQueue[currentIndex]?.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
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
                onAction={handleAction}
                onWatchTrailer={() => setTrailerMovie(currentQueue[currentIndex])}
              />
            </motion.div>
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
      />
    </div>
  );
};

export default DiscoverSection;