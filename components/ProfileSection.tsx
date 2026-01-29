
import React, { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Added Plus to imports from lucide-react
import { Star, Clapperboard, Film, Trophy, Clock, ChevronRight, Edit3, Camera, Check, X, Loader2, Plus } from 'lucide-react';
import { Movie, UserProfile } from '../types';
import { MovieService } from '../services/movieService';

interface ProfileSectionProps {
  profile: UserProfile | undefined;
  likedMovies: Movie[];
  watchedMovies: Movie[];
  onViewAllWatched: () => void;
  onProfileUpdate: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ 
  profile, 
  likedMovies, 
  watchedMovies, 
  onViewAllWatched,
  onProfileUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      let finalAvatarUrl = profile.avatar_url;
      
      if (editPhoto) {
        const uploadedUrl = await MovieService.uploadAvatar(profile.username, editPhoto);
        if (uploadedUrl) finalAvatarUrl = uploadedUrl;
      }

      const success = await MovieService.saveProfile({
        ...profile,
        full_name: editName,
        avatar_url: finalAvatarUrl
      });

      if (success) {
        setIsEditing(false);
        onProfileUpdate();
      }
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName(profile?.full_name || '');
    setEditPhoto(null);
    setPhotoPreview(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-32">
      {/* Profile Header */}
      <div className="p-6 flex justify-between items-start">
        <div>
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-0.5 block">Your Identity</span>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-6">Profile</h2>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-[#DE3151] transition-all active:scale-95 shadow-xl"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Identity Card */}
      <div className="px-6 mb-8">
        <motion.div 
          layout
          className="relative overflow-hidden bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl"
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative group mb-6">
              <div 
                onClick={() => isEditing && fileInputRef.current?.click()}
                className={`w-32 h-32 rounded-[2.5rem] bg-zinc-950 border-4 overflow-hidden shadow-2xl transition-all duration-500 ${isEditing ? 'border-[#DE3151] cursor-pointer' : 'border-zinc-800'}`}
              >
                <img 
                  src={photoPreview || profile?.avatar_url} 
                  className="w-full h-full object-cover" 
                  alt="Profile" 
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white opacity-80" />
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#DE3151] rounded-2xl flex items-center justify-center shadow-2xl text-white">
                  <Plus className="w-5 h-5" />
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>

            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full space-y-4"
                >
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-zinc-950 border-b-2 border-zinc-800 focus:border-[#DE3151] text-2xl font-black text-white text-center py-2 outline-none transition-all placeholder:text-zinc-800"
                  />
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="flex-1 h-14 bg-zinc-950 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving || !editName.trim()}
                      className="flex-[2] h-14 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-3 disabled:opacity-20 transition-all hover:brightness-110 active:scale-[0.98]"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Save Changes</>}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-1"
                >
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{profile?.full_name}</h3>
                  <div className="flex items-center justify-center gap-2">
                    <div 
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                      style={{ backgroundColor: `${stats.personaColor}20`, color: stats.personaColor }}
                    >
                      {stats.watcherType}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 rounded-full" style={{ backgroundColor: stats.personaColor }} />
        </motion.div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 px-6 mb-10">
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex flex-col gap-1 shadow-xl">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Film className="w-3 h-3" /> Seen</span>
          <span className="text-2xl font-black text-white">{watchedMovies.length}</span>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex flex-col gap-1 shadow-xl">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Star className="w-3 h-3" /> Liked</span>
          <span className="text-2xl font-black text-white">{likedMovies.length}</span>
        </div>
      </div>

      {/* Taste Breakdown */}
      <div className="space-y-10 mb-10">
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
              <p className="text-zinc-700 text-xs italic px-6">Continue swiping to discover your niche...</p>
            )}
          </div>
        </div>

        <div>
          <div className="px-6 flex justify-between items-end mb-4">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Favorite Directors</h4>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-6">
            {stats.topDirectors.length > 0 ? stats.topDirectors.map(director => (
              <div key={director} className="flex-shrink-0 bg-zinc-900 p-5 rounded-2xl border border-white/5 flex items-center gap-3 shadow-xl">
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
                className="flex items-center gap-4 bg-zinc-900/30 p-4 rounded-3xl border border-white/5 group cursor-pointer shadow-lg"
              >
                <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 shrink-0">
                  <img src={movie.posterUrl} className="w-full h-full object-cover" alt={movie.title} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-black text-white truncate">{movie.title}</h5>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{movie.releaseYear}</p>
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
