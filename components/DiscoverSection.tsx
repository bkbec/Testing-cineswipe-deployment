
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import { Movie, InteractionType } from '../types';
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
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [exitDirection, setExitDirection] = useState<{ x: number; y: number; rotate: number }>({ x: 0, y: 0, rotate: 0 });

  const loadMovies = useCallback(async (isInitial: boolean = true) => {
    if (isInitial) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const pageToFetch = isInitial ? 1 : nextPage;
      const { movies, nextPage: next } = await MovieService.getDiscoverQueue(userId, pageToFetch);
      
      const displayQueue = (movies || []).filter(m => m && m.id);
      
      setQueue(prev => isInitial ? displayQueue : [...prev, ...displayQueue]);
      setNextPage(next);
      if (isInitial) setCurrentIndex(0);
    } catch (e) {
      console.error("Discover load error", e);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [nextPage, userId]);

  useEffect(() => {
    loadMovies(true);
  }, []);

  // Fetch more when getting close to end
  useEffect(() => {
    if (!isLoading && !isFetchingMore && queue.length > 0 && (queue.length - currentIndex) < 5) {
      loadMovies(false);
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
        timestamp: Date.now(),
        notes: '' // Explicitly sending empty string as per requirement
      });
      if (onInteraction) onInteraction(safeMovieId, type);
    }

    setCurrentIndex(prev => prev + 1);
  };

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
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-black text-white tracking-tighter">Discover</h2>
          {isFetchingMore && <Loader2 className="w-3 h-3 text-[#DE3151] animate-spin" />}
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
        <AnimatePresence mode="popLayout">
          {isEmpty && !isFetchingMore ? (
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
                onClick={() => loadMovies(true)}
                className="w-full bg-[#DE3151] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-[#DE3151]/30 hover:brightness-110 active:scale-95 transition-all"
              >
                Reload Feed
              </button>
            </motion.div>
          ) : (
            currentQueue[currentIndex] && (
              <motion.div
                key={currentQueue[currentIndex].id}
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
      />
    </div>
  );
};

export default DiscoverSection;
