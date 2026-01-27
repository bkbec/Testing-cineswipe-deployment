import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Edit3, Save, X, Film } from 'lucide-react';
import { Movie, UserInteraction } from '../types';
import { MovieService } from '../services/movieService';

interface WatchedHistoryViewProps {
  userId: string;
  movies: Movie[];
  onBack: () => void;
  onUpdate: () => void;
}

const WatchedHistoryView: React.FC<WatchedHistoryViewProps> = ({ userId, movies, onBack, onUpdate }) => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const data = await MovieService.getInteractions(userId);
      setInteractions(data);
    };
    fetch();
  }, [userId]);

  const openRatingModal = (movie: Movie) => {
    const existing = interactions.find(i => i.movieId === movie.id);
    setSelectedMovie(movie);
    setRating(existing?.personalRating || 0);
    setNote(existing?.notes || '');
  };

  const handleSave = async () => {
    if (selectedMovie) {
      await MovieService.updateInteraction(userId, selectedMovie.id, {
        personalRating: rating,
        notes: note
      });
      const data = await MovieService.getInteractions(userId);
      setInteractions(data);
      onUpdate();
      setSelectedMovie(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-black overflow-y-auto no-scrollbar pb-32">
      {/* Header */}
      <div className="p-6 flex items-center gap-4 sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-white/5">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-0.5 block">Archive</span>
          <h2 className="text-xl font-black text-white tracking-tighter uppercase">Watched History</h2>
        </div>
      </div>

      {/* Grid */}
      <div className="p-6 grid grid-cols-2 gap-4">
        {movies.map(movie => {
          const interaction = interactions.find(i => i.movieId === movie.id);
          const hasRating = interaction?.personalRating && interaction.personalRating > 0;

          return (
            <motion.div 
              key={movie.id}
              layoutId={`movie-${movie.id}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => openRatingModal(movie)}
              className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 group shadow-xl cursor-pointer"
            >
              <img src={movie.posterUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={movie.title} />
              
              {/* Badge for existing rating */}
              {hasRating && (
                <div className="absolute top-2 right-2 bg-[#DE3151] rounded-full px-2 py-1 flex items-center gap-1 shadow-lg border border-white/10">
                  <Star className="w-3 h-3 text-white fill-white" />
                  <span className="text-[10px] font-black text-white">{interaction.personalRating}</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                <h3 className="text-[10px] font-black text-white truncate uppercase tracking-wider">{movie.title}</h3>
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{movie.releaseYear}</p>
                
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[#DE3151] text-[9px] font-black uppercase tracking-widest">
                  <Edit3 className="w-3 h-3" />
                  Rate & Feed
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {movies.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-30">
          <Film className="w-16 h-16 text-zinc-600" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No watch history found.</p>
        </div>
      )}

      {/* Rating & Note Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMovie(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-zinc-950 border-t border-white/10 rounded-t-[3rem] p-8 pb-12 shadow-[0_-20px_60px_rgba(222,49,81,0.2)]"
            >
              <div className="w-16 h-1 bg-zinc-800 rounded-full mx-auto mb-8" />
              
              <div className="flex gap-6 mb-8">
                <div className="w-24 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shrink-0">
                  <img src={selectedMovie.posterUrl} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-[#DE3151] uppercase tracking-[0.4em] mb-1 block">Train Algorithm</span>
                  <h3 className="text-2xl font-black text-white tracking-tighter mb-2">{selectedMovie.title}</h3>
                  <p className="text-zinc-500 text-xs font-medium italic">Tell CineMatch what you thought to get better suggestions.</p>
                </div>
              </div>

              {/* Star Rating */}
              <div className="mb-8">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-4 block text-center">Your Rating</label>
                <div className="flex justify-center gap-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button 
                      key={s}
                      onClick={() => setRating(s)}
                      className="transition-all active:scale-90"
                    >
                      <Star 
                        className={`w-10 h-10 ${s <= rating ? 'text-[#DE3151] fill-[#DE3151]' : 'text-zinc-800'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-10">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-3 block">Personal Notes</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you love or hate? (Algorithm feeds on keywords...)"
                  className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-white font-medium text-sm outline-none focus:border-[#DE3151] transition-colors resize-none placeholder:text-zinc-700"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedMovie(null)}
                  className="flex-1 py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-[2] py-5 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-[#DE3151]/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Save className="w-4 h-4" />
                  Feed Algorithm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WatchedHistoryView;