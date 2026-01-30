
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clapperboard, Film, Trophy, Clock, ChevronRight, Edit3, Camera, Check, X, Loader2, Plus, Trash2, AlertTriangle, RefreshCw, CheckCircle2, AlertCircle, BarChart3, Users } from 'lucide-react';
import { Movie, UserProfile } from '../types';
import { MovieService } from '../services/movieService';

interface ProfileSectionProps {
  profile: UserProfile | undefined;
  likedMovies: Movie[];
  watchedMovies: Movie[];
  onViewAllWatched: () => void;
  onProfileUpdate: () => void;
  onAccountDelete?: () => void;
  onShowToast?: (msg: string) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ 
  profile, 
  likedMovies, 
  watchedMovies, 
  onViewAllWatched,
  onProfileUpdate,
  onAccountDelete,
  onShowToast
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [letterboxdUser, setLetterboxdUser] = useState(profile?.letterboxd_username || '');
  
  // Connection Flow States
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(!!profile?.letterboxd_username);
  const [letterboxdError, setLetterboxdError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name);
      setLetterboxdUser(profile.letterboxd_username || '');
      setIsConnected(!!profile.letterboxd_username);
    }
  }, [profile]);

  const handleConnect = async () => {
    if (!letterboxdUser) return;
    setIsConnecting(true);
    setLetterboxdError(null);
    try {
      await MovieService.validateLetterboxdUser(letterboxdUser);
      setIsConnected(true);
      if (onShowToast) onShowToast("Letterboxd account recognized!");
    } catch (e: any) {
      setLetterboxdError(e.message);
      if (onShowToast) onShowToast(e.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!profile || !isConnected || !letterboxdUser) return;
    setIsSyncing(true);
    setSyncProgress("Establishing connection...");
    try {
      const count = await MovieService.syncLetterboxdHistory(
        letterboxdUser, 
        profile.username,
        (msg) => setSyncProgress(msg)
      );
      if (onShowToast) onShowToast(`Successfully synced ${count} films!`);
      onProfileUpdate();
    } catch (err: any) {
      if (onShowToast) onShowToast("Sync failed. Check console for details.");
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
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
        avatar_url: finalAvatarUrl,
        letterboxd_username: isConnected ? letterboxdUser : ''
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

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const stats = useMemo(() => {
    const allInteracted = [...likedMovies, ...watchedMovies];
    
    // Genres
    const genreCounts: Record<string, number> = {};
    allInteracted.forEach(m => m.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
    const sortedGenres = Object.entries(genreCounts).sort(([, a], [, b]) => b - a);
    const topGenres = sortedGenres.slice(0, 4).map(([name, count]) => ({ name, count }));
    
    // Directors
    const directorCounts: Record<string, number> = {};
    allInteracted.forEach(m => {
      if (m.director) {
        directorCounts[m.director] = (directorCounts[m.director] || 0) + 1;
      }
    });
    const topDirectors = Object.entries(directorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Watcher Persona
    let persona = "Movie Explorer";
    if (topGenres[0]?.name === "Sci-Fi" || topGenres[0]?.name === "Science Fiction") persona = "Quantum Visionary";
    else if (topGenres[0]?.name === "Horror") persona = "Thrill Seeker";
    else if (topGenres[0]?.name === "Comedy") persona = "Laughter Enthusiast";
    else if (topGenres[0]?.name === "Drama") persona = "The Auteur Enthusiast";
    else if (topGenres[0]?.name === "Romance") persona = "Star-Crossed Watcher";
    else if (watchedMovies.length > 50) persona = "Master Cinephile";

    return { topGenres, topDirectors, persona, personaColor: "#DE3151" };
  }, [likedMovies, watchedMovies]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-32 text-white">
      <div className="p-6 flex justify-between items-start">
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-6">Profile</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-[#DE3151] transition-all"><Edit3 className="w-5 h-5" /></button>
        )}
      </div>

      <div className="px-6 mb-8">
        <motion.div layout className="relative overflow-hidden bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div onClick={() => isEditing && fileInputRef.current?.click()} className={`w-32 h-32 rounded-[2.5rem] bg-zinc-950 border-4 overflow-hidden flex items-center justify-center ${isEditing ? 'border-[#DE3151] cursor-pointer' : 'border-zinc-800'}`}>
                {(photoPreview || profile?.avatar_url) ? <img src={photoPreview || profile?.avatar_url} className="w-full h-full object-cover" /> : <span className="text-4xl font-black">{profile ? getInitials(profile.full_name) : '??'}</span>}
                {isEditing && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Camera className="w-8 h-8 text-white opacity-80" /></div>}
              </div>
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setEditPhoto(f); const r = new FileReader(); r.onloadend = () => setPhotoPreview(r.result as string); r.readAsDataURL(f); }
              }} className="hidden" accept="image/*" />
            </div>

            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div key="edit" className="w-full space-y-4">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full Name" className="w-full bg-zinc-950 border-b-2 border-zinc-800 focus:border-[#DE3151] text-2xl font-black text-center py-2 outline-none" />
                  <div className="flex gap-3 pt-4">
                    <button onClick={() => { setIsEditing(false); setPhotoPreview(null); }} className="flex-1 h-14 bg-zinc-950 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-[2] h-14 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-widest text-xs">{isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save'}</button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-3xl font-black uppercase">{profile?.full_name}</h3>
                  <div className="px-4 py-1.5 bg-[#DE3151]/20 text-[#DE3151] rounded-full text-[10px] font-black uppercase inline-block border border-[#DE3151]/30">{stats.persona}</div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Taste DNA - Statistics Section */}
      <div className="px-6 mb-10">
        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
          <BarChart3 className="w-3 h-3 text-[#DE3151]" />
          Taste DNA
        </h4>
        <div className="grid grid-cols-1 gap-4">
           {/* Genre Breakdown */}
           <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 shadow-xl">
             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-4">Top Genres</label>
             <div className="space-y-4">
               {stats.topGenres.length > 0 ? stats.topGenres.map((g, i) => (
                 <div key={g.name} className="space-y-1.5">
                   <div className="flex justify-between items-center px-1">
                     <span className="text-xs font-black text-white uppercase">{g.name}</span>
                     <span className="text-[10px] font-bold text-zinc-500">{g.count} Films</span>
                   </div>
                   <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${Math.min(100, (g.count / (stats.topGenres[0]?.count || 1)) * 100)}%` }}
                       transition={{ duration: 1, delay: i * 0.1 }}
                       className="h-full bg-[#DE3151]" 
                     />
                   </div>
                 </div>
               )) : (
                 <p className="text-[10px] text-zinc-600 font-bold italic">Swipe to generate your genre DNA...</p>
               )}
             </div>
           </div>

           {/* Director's Cut */}
           <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 shadow-xl">
             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-4 flex items-center gap-2">
               <Clapperboard className="w-3 h-3 text-[#DE3151]" />
               The Director's Cut
             </label>
             <div className="flex flex-wrap gap-2">
               {stats.topDirectors.length > 0 ? stats.topDirectors.map(d => (
                 <div key={d.name} className="px-4 py-3 bg-zinc-950 border border-white/5 rounded-2xl flex items-center gap-3">
                   <div className="w-6 h-6 bg-[#DE3151] rounded-lg flex items-center justify-center text-[10px] font-black">
                     {d.count}
                   </div>
                   <span className="text-xs font-black text-zinc-300">{d.name}</span>
                 </div>
               )) : (
                 <p className="text-[10px] text-zinc-600 font-bold italic">We'll identify your favorite auteurs soon...</p>
               )}
             </div>
           </div>
        </div>
      </div>

      <div className="px-6 mb-10">
        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">External Sync</h4>
        <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-5">
           <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-black text-white mb-1">Letterboxd Account</h5>
                {isConnected ? (
                  <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 className="w-3 h-3" /> Recognized: {letterboxdUser}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500">Connect to sync your seen history.</p>
                )}
              </div>
              {isConnected && (
                <button onClick={() => { setIsConnected(false); setLetterboxdUser(''); }} className="text-zinc-600 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              )}
           </div>

           {!isConnected ? (
             <div className="space-y-4">
               <input 
                 type="text" 
                 placeholder="Letterboxd Username" 
                 value={letterboxdUser} 
                 onChange={(e) => { setLetterboxdUser(e.target.value); setLetterboxdError(null); }}
                 className="w-full bg-zinc-950 border-b-2 border-zinc-800 p-3 text-white font-black outline-none focus:border-[#DE3151]"
               />
               <button onClick={handleConnect} disabled={isConnecting || !letterboxdUser} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                 {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                 Recognize Account
               </button>
             </div>
           ) : (
             <div className="space-y-4">
               <button onClick={handleSync} disabled={isSyncing} className="w-full py-4 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-[#DE3151]/20 active:scale-95 transition-all">
                 {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                 {isSyncing ? 'Syncing...' : 'Sync Seen Films'}
               </button>
               {syncProgress && <p className="text-[9px] font-bold text-[#DE3151] uppercase text-center animate-pulse tracking-widest">{syncProgress}</p>}
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-6 mb-10">
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 shadow-xl">
          <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-widest"><Film className="w-3 h-3" /> Seen</span>
          <span className="text-2xl font-black text-white">{watchedMovies.length}</span>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 shadow-xl">
          <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-widest"><Star className="w-3 h-3" /> Liked</span>
          <span className="text-2xl font-black text-white">{likedMovies.length}</span>
        </div>
      </div>

      <div className="px-6 mb-10">
        <div className="flex justify-between items-end mb-6">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recent Archive</h4>
          <button onClick={onViewAllWatched} className="text-[10px] font-bold text-[#DE3151] uppercase tracking-widest">View All</button>
        </div>
        <div className="space-y-4">
          {watchedMovies.slice(0, 3).map(movie => (
            <div key={movie.id} className="flex items-center gap-4 bg-zinc-900/30 p-4 rounded-3xl border border-white/5">
              <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden shrink-0"><img src={movie.posterUrl} className="w-full h-full object-cover" /></div>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-black text-white truncate">{movie.title}</h5>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{movie.releaseYear}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-800" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 mt-10 pt-10 border-t border-white/5">
        <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-4 bg-red-600/10 text-red-600 rounded-2xl font-black uppercase text-[10px] border border-red-600/20 tracking-widest">Delete Profile</button>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative w-full max-w-sm bg-zinc-900 border border-red-500/30 rounded-[3rem] p-8 text-center">
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-6" />
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">Final Warning</h3>
              <p className="text-zinc-500 text-sm mb-10">This will permanently delete your preferences and history.</p>
              <div className="flex flex-col gap-3">
                <button onClick={async () => { setIsDeleting(true); if (await MovieService.deleteProfile(profile!.username)) onAccountDelete?.(); }} disabled={isDeleting} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">{isDeleting ? 'Deleting...' : 'Confirm'}</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-5 bg-zinc-800 text-zinc-400 rounded-2xl font-black uppercase text-xs tracking-widest">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileSection;
