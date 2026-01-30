
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
          {/* Poster Section */}
          <div className="relative h-[55%] w-full overflow-hidden bg-zinc-800 shrink-0">
            <img 
              src={movie.posterUrl} 
              alt={movie.title} 
              className="w-full h-full object-cover transition-transform duration-700 pointer-events-none" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent pointer-events-none" />
            
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onWatchTrailer(); }}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </button>
            
            <div className="absolute bottom-4 left-6 right-6 pointer-events-none">
               <span className="text-[8px] font-black text-[#DE3151] uppercase tracking-[0.3em] mb-0.5 block">{movie.releaseYear}</span>
               <h2 className="text-xl font-black leading-tight text-white tracking-tighter drop-shadow-xl uppercase">{movie.title}</h2>
            </div>
          </div>

          {/* Info Section */}
          <div className="px-6 py-4 flex-1 flex flex-col min-h-0 bg-zinc-950/20 pointer-events-none">
            {/* Genre & Ratings Bar */}
            <div className="flex items-center gap-2 mb-3 shrink-0 overflow-hidden">
               {/* Genre Tags - Prominently positioned to the left */}
               <div className="flex gap-1.5 shrink-0">
                  {movie.genres && movie.genres.length > 0 ? (
                    movie.genres.slice(0, 1).map((genre) => (
                      <span key={genre} className="px-2 py-0.5 bg-[#DE3151] rounded-md text-[8px] font-black text-white uppercase tracking-wider shadow-lg shadow-[#DE3151]/20">
                        {genre}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-800 rounded-md text-[8px] font-black text-zinc-500 uppercase tracking-wider">
                      Movie
                    </span>
                  )}
               </div>
               
               <div className="flex items-center gap-1 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded-md shadow-lg">
                  <img src={rtIcon} className="w-3 h-3 object-contain" alt="RT" />
                  <span className="text-[9px] font-black text-white">{movie.ratings.rottenTomatoesCritic}%</span>
               </div>
               
               <div className="flex items-center gap-1 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded-md shadow-lg">
                  <span className="text-[10px] leading-none">🍿</span>
                  <span className="text-[9px] font-black text-white">{movie.ratings.rottenTomatoesAudience}%</span>
               </div>
               
               <div className="flex items-center gap-1 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded-md shadow-lg ml-auto">
                 <span className="text-[9px] font-black text-[#00E054]">{movie.ratings.letterboxd}</span>
                 <Star className="w-2.5 h-2.5 fill-[#00E054] text-[#00E054]" />
               </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0 mb-3">
              <div className="flex justify-between items-start gap-4 h-full">
                <p className="text-zinc-400 text-[11px] font-medium leading-relaxed flex-1 line-clamp-4 overflow-hidden">
                  {movie.description}
                </p>
                <button 
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                  className="w-7 h-7 bg-zinc-900 rounded-full border border-white/5 flex items-center justify-center text-zinc-600 hover:text-white transition-colors shrink-0 pointer-events-auto"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="flex justify-between items-center gap-2 shrink-0 pointer-events-auto">
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); onAction(InteractionType.NO); }}
                 className="w-10 h-10 bg-zinc-900/80 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95 group"
               >
                 <X className="w-4 h-4" />
               </button>
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); onAction(InteractionType.WATCHED); }}
                 className="flex-1 h-10 bg-zinc-900/80 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all active:scale-95 group gap-2"
               >
                 <Eye className="w-4 h-4" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Seen</span>
               </button>
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); onAction(InteractionType.YES); }}
                 className="flex-1 h-10 bg-[#DE3151] rounded-lg flex items-center justify-center text-white font-black uppercase tracking-widest text-[9px] hover:brightness-110 transition-all active:scale-95 group shadow-lg shadow-[#DE3151]/10 gap-2"
               >
                 <Heart className="w-3.5 h-3.5 fill-white" />
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
          <div className="p-7 flex flex-col h-full overflow-y-auto no-scrollbar pointer-events-auto">
            <div className="flex justify-between items-center mb-6 shrink-0">
               <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Film Brief</h3>
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                 className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400"
               >
                 <RotateCcw className="w-4 h-4" />
               </button>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-[0.3em] mb-2 block">Synopsis</label>
                <p className="text-zinc-400 text-xs font-medium leading-relaxed">{movie.fullSynopsis || movie.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/40 p-3.5 rounded-xl border border-white/5">
                   <div className="flex items-center gap-2 mb-1.5 text-zinc-600">
                     <Clapperboard className="w-3 h-3" />
                     <span className="text-[8px] font-black uppercase tracking-widest">Director</span>
                   </div>
                   <span className="text-zinc-200 text-[11px] font-bold truncate block">{movie.director || 'N/A'}</span>
                </div>
                <div className="bg-zinc-800/40 p-3.5 rounded-xl border border-white/5">
                   <div className="flex items-center gap-2 mb-1.5 text-zinc-600">
                     <Clock className="w-3 h-3" />
                     <span className="text-[8px] font-black uppercase tracking-widest">Runtime</span>
                   </div>
                   <span className="text-zinc-200 text-[11px] font-bold">{movie.runtime || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-[0.3em] mb-3 block">Starring</label>
                <div className="flex flex-wrap gap-1.5">
                   {movie.cast?.map(actor => (
                     <div key={actor} className="flex items-center gap-1.5 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-white/5">
                        <User className="w-2.5 h-2.5 text-[#DE3151]" />
                        <span className="text-[10px] font-bold text-zinc-300">{actor}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 shrink-0">
               <button 
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                 className="w-full py-3.5 bg-zinc-800 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-zinc-700 transition-colors"
               >
                 Close Brief
               </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MovieCard;
