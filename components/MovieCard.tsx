
import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Play, Eye, Heart, X, RotateCcw, Info, User, Clapperboard, Clock, Star } from 'lucide-react';
import { Movie, InteractionType } from '../types';

interface MovieCardProps {
  movie: Movie;
  onAction: (type: InteractionType) => void;
  isTop: boolean;
  onWatchTrailer: () => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onAction, isTop, onWatchTrailer }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-300, -250, 0, 250, 300], [0, 1, 1, 1, 0]);

  const handleTap = (e: any) => {
    // Only flip if not clicking an action button or the trailer button
    if (e.target.closest('button')) return;
    setIsFlipped(!isFlipped);
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      onAction(InteractionType.YES);
    } else if (info.offset.x < -swipeThreshold) {
      onAction(InteractionType.NO);
    } else if (info.offset.y < -swipeThreshold) {
      onAction(InteractionType.WATCHED);
    }
  };

  // Determine the correct RT icon based on score
  const rtIcon = movie.ratings.rottenTomatoesCritic >= 60 
    ? "https://www.rottentomatoes.com/assets/cas/images/static/icons/fresh.svg"
    : "https://www.rottentomatoes.com/assets/cas/images/static/icons/rotten.svg";

  return (
    <div className={`absolute inset-0 transition-all duration-700 ${isTop ? 'z-10' : 'z-0 opacity-0'}`} style={{ perspective: '2000px' }}>
      <motion.div 
        className="relative w-full h-full"
        style={{ 
          transformStyle: 'preserve-3d',
          touchAction: 'none',
          x,
          y,
          rotate,
          opacity
        }}
        drag={isTop && !isFlipped}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.8}
        dragListener={true}
        onDragEnd={handleDragEnd}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      >
        {/* FRONT SIDE */}
        <motion.div 
          className="absolute inset-0 bg-zinc-900 rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/5 flex flex-col"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          onPointerDown={(e) => isFlipped && e.stopPropagation()}
          onTap={handleTap}
        >
          {/* Poster Section (The "Trailer" trigger area) */}
          <div className="relative h-[55%] w-full overflow-hidden bg-zinc-800 shrink-0">
            <img 
              src={movie.posterUrl} 
              alt={movie.title} 
              className="w-full h-full object-cover transition-transform duration-700 pointer-events-none" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent pointer-events-none" />
            
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onWatchTrailer(); }}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="w-20 h-20 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-white/20 transition-all duration-500">
                <Play className="w-8 h-8 text-white fill-white ml-1.5" />
              </div>
            </button>
            
            <div className="absolute bottom-6 left-8 right-8 pointer-events-none">
               <span className="text-[10px] font-black text-[#DE3151] uppercase tracking-[0.4em] mb-1 block">{movie.releaseYear}</span>
               <h2 className="text-3xl font-black leading-none text-white tracking-tighter drop-shadow-lg">{movie.title}</h2>
            </div>
          </div>

          {/* Info Section */}
          <div className="px-7 py-6 flex-1 flex flex-col min-h-0 bg-zinc-950/20 pointer-events-none">
            {/* Ratings Bar */}
            <div className="flex items-center gap-3 mb-4 shrink-0">
               <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-xl shadow-lg">
                  <img 
                    src={rtIcon} 
                    className="w-4 h-4 object-contain" 
                    alt="RT Critic" 
                  />
                  <span className="text-xs font-black text-white">{movie.ratings.rottenTomatoesCritic}%</span>
               </div>
               <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-xl shadow-lg">
                  <span className="text-base leading-none">🍿</span>
                  <span className="text-xs font-black text-white">{movie.ratings.rottenTomatoesAudience}%</span>
               </div>
               <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-xl shadow-lg ml-auto">
                 <span className="text-xs font-black text-[#00E054]">{movie.ratings.letterboxd}</span>
                 <Star className="w-3 h-3 fill-[#00E054] text-[#00E054]" />
               </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex justify-between items-start mb-3">
                <p className="text-zinc-400 text-sm font-medium line-clamp-2 leading-relaxed flex-1 mr-3">
                  {movie.description}
                </p>
                <button 
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                  className="w-9 h-9 bg-zinc-900 rounded-full border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0 pointer-events-auto"
                >
                  <Info className="w-4.5 h-4.5" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2 shrink-0 overflow-hidden h-6">
                {movie.genres.slice(0, 3).map(g => (
                  <span key={g} className="px-2.5 py-0.5 bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-black text-zinc-500 uppercase tracking-wider">{g}</span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-3 mt-4 shrink-0 pb-2 pointer-events-auto">
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); onAction(InteractionType.NO); }}
                 className="flex-1 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all active:scale-95 group"
               >
                 <X className="w-5 h-5" />
               </button>
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); onAction(InteractionType.WATCHED); }}
                 className="flex-1 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-sky-400 hover:bg-sky-400/10 transition-all active:scale-95 group"
               >
                 <Eye className="w-5 h-5" />
               </button>
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); onAction(InteractionType.YES); }}
                 className="flex-[1.5] h-14 bg-[#DE3151] rounded-2xl flex items-center justify-center text-white font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all active:scale-95 group shadow-xl shadow-[#DE3151]/20"
               >
                 <Heart className="w-4 h-4 mr-2 fill-white" />
                 Like
               </button>
            </div>
          </div>
        </motion.div>

        {/* BACK SIDE */}
        <motion.div 
          className="absolute inset-0 bg-zinc-900 rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          onTap={handleTap}
        >
          <div className="p-8 flex flex-col h-full overflow-y-auto no-scrollbar pointer-events-auto">
            <div className="flex justify-between items-center mb-6 shrink-0">
               <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Film Brief</h3>
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                 className="w-10 h-10 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400"
               >
                 <RotateCcw className="w-5 h-5" />
               </button>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-2 block">Synopsis</label>
                <p className="text-zinc-300 text-sm font-medium leading-relaxed">{movie.fullSynopsis || movie.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-2 mb-2 text-zinc-500">
                     <Clapperboard className="w-3 h-3" />
                     <span className="text-[9px] font-black uppercase tracking-widest">Director</span>
                   </div>
                   <span className="text-white text-sm font-bold">{movie.director || 'N/A'}</span>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-2 mb-2 text-zinc-500">
                     <Clock className="w-3 h-3" />
                     <span className="text-[9px] font-black uppercase tracking-widest">Runtime</span>
                   </div>
                   <span className="text-white text-sm font-bold">{movie.runtime || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-3 block">Starring</label>
                <div className="flex flex-wrap gap-2">
                   {movie.cast?.map(actor => (
                     <div key={actor} className="flex items-center gap-2 bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-white/5">
                        <User className="w-2.5 h-2.5 text-[#DE3151]" />
                        <span className="text-[11px] font-bold text-white">{actor}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 shrink-0">
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                 className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-colors"
               >
                 Back to Poster
               </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MovieCard;
