
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, Clapperboard, Film, Trophy, Clock, ChevronRight } from 'lucide-react';
import { Movie } from '../types';

interface ProfileSectionProps {
  likedMovies: Movie[];
  watchedMovies: Movie[];
  onViewAllWatched: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ likedMovies, watchedMovies, onViewAllWatched }) => {
  const stats = useMemo(() => {
    const allInteracted = [...likedMovies, ...watchedMovies];
    
    // Genre Counts
    const genreCounts: Record<string, number> = {};
    allInteracted.forEach(m => {
      m.genres.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    
    // Director Counts
    const directorCounts: Record<string, number> = {};
    allInteracted.forEach(m => {
      if (m.director) {
        directorCounts[m.director] = (directorCounts[m.director] || 0) + 1;
      }
    });

    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    const topDirectors = Object.entries(directorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    // Watcher Type Logic
    let watcherType = "The Explorer";
    let personaColor = "#DE3151";
    
    if (genreCounts['Sci-Fi'] > 2 || genreCounts['Fantasy'] > 2) {
      watcherType = "The Visionary";
      personaColor = "#00D1FF";
    } else if (genreCounts['Horror'] > 2 || genreCounts['Thriller'] > 2) {
      watcherType = "The Adrenaline Junkie";
      personaColor = "#FF4B2B";
    } else if (genreCounts['Romance'] > 2 || genreCounts['Comedy'] > 2) {
      watcherType = "The Heartseeker";
      personaColor = "#FF007A";
    } else if (genreCounts['Drama'] > 2 || genreCounts['Documentary'] > 2) {
      watcherType = "The Historian";
      personaColor = "#FFB800";
    } else if (allInteracted.length > 10) {
      watcherType = "The Cinephile";
      personaColor = "#DE3151";
    }

    return { topGenres, topDirectors, watcherType, personaColor, totalInteractions: allInteracted.length };
  }, [likedMovies, watchedMovies]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-32">
      {/* Profile Header */}
      <div className="p-6 pb-2">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-0.5 block">Your Identity</span>
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-6">Profile</h2>
      </div>

      {/* Persona Badge */}
      <div className="px-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8"
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-2xl transition-all duration-700"
              style={{ backgroundColor: `${stats.personaColor}20`, border: `2px solid ${stats.personaColor}` }}
            >
              <Trophy className="w-10 h-10" style={{ color: stats.personaColor }} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-1" style={{ color: stats.personaColor }}>Member Level</h3>
            <h4 className="text-3xl font-black text-white tracking-tighter mb-2">{stats.watcherType}</h4>
            <p className="text-zinc-500 text-xs font-medium max-w-[200px]">Based on your affinity for {stats.topGenres[0] || 'diverse cinema'} and {stats.topGenres[1] || 'new releases'}.</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 rounded-full" style={{ backgroundColor: stats.personaColor }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 blur-[60px] opacity-10 rounded-full" style={{ backgroundColor: stats.personaColor }} />
        </motion.div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 px-6 mb-10">
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex flex-col gap-1">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Film className="w-3 h-3" /> Seen</span>
          <span className="text-2xl font-black text-white">{watchedMovies.length}</span>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex flex-col gap-1">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Star className="w-3 h-3" /> Liked</span>
          <span className="text-2xl font-black text-white">{likedMovies.length}</span>
        </div>
      </div>

      {/* Taste Breakdown */}
      <div className="space-y-10 mb-10">
        {/* Top Genres */}
        <div>
          <div className="px-6 flex justify-between items-end mb-4">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Top Genres</h4>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-6">
            {stats.topGenres.length > 0 ? stats.topGenres.map(genre => (
              <div key={genre} className="flex-shrink-0 bg-zinc-900 px-6 py-4 rounded-2xl border border-white/5 shadow-xl">
                <span className="text-sm font-black text-white">{genre}</span>
              </div>
            )) : (
              <p className="text-zinc-700 text-xs italic">Continue swiping to discover your niche...</p>
            )}
          </div>
        </div>

        {/* Top Directors */}
        <div>
          <div className="px-6 flex justify-between items-end mb-4">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Favorite Directors</h4>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-6">
            {stats.topDirectors.length > 0 ? stats.topDirectors.map(director => (
              <div key={director} className="flex-shrink-0 bg-zinc-900 p-5 rounded-2xl border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                  <Clapperboard className="w-4 h-4 text-[#DE3151]" />
                </div>
                <span className="text-sm font-black text-white">{director}</span>
              </div>
            )) : (
              <p className="text-zinc-700 text-xs italic px-6">Watch more to reveal your favorite masters...</p>
            )}
          </div>
        </div>
      </div>

      {/* Watched History Section */}
      <div className="px-6 mb-10">
        <div className="flex justify-between items-end mb-6">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Recent Reels (Watched)</h4>
          <button onClick={onViewAllWatched} className="text-[10px] font-bold text-[#DE3151] uppercase hover:underline">View All</button>
        </div>

        {watchedMovies.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-zinc-900 rounded-[2rem] flex flex-col items-center justify-center text-center opacity-40">
            <Clock className="w-10 h-10 mb-4 text-zinc-700" />
            <p className="text-zinc-600 text-xs font-medium uppercase tracking-widest">No watch history yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {watchedMovies.slice(0, 5).map(movie => (
              <motion.div 
                key={movie.id}
                whileTap={{ scale: 0.98 }}
                onClick={onViewAllWatched}
                className="flex items-center gap-4 bg-zinc-900/30 p-4 rounded-3xl border border-white/5 group cursor-pointer"
              >
                <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 shrink-0">
                  <img src={movie.posterUrl} className="w-full h-full object-cover" alt={movie.title} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-black text-white truncate">{movie.title}</h5>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{movie.releaseYear}</p>
                  <div className="flex gap-1">
                    {movie.genres.slice(0, 2).map(g => (
                      <span key={g} className="text-[8px] font-black text-zinc-700 uppercase">{g}</span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-800" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSection;
