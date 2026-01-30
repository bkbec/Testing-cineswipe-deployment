
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clapperboard, Film, Trophy, Clock, ChevronRight, Edit3, Camera, Check, X, Loader2, Plus, Trash2, AlertTriangle, RefreshCw, CheckCircle2, AlertCircle, BarChart3, Users, Zap, Flame } from 'lucide-react';
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
    
    const genreCounts: Record<string, number> = {};
    allInteracted.forEach(m => m.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
    const sortedGenres = Object.entries(genreCounts).sort(([, a], [, b]) => b - a);
    const topGenres = sortedGenres.slice(0, 4).map(([name, count]) => ({ name, count }));
    
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

    let persona = "Movie Explorer";
    const primary = topGenres[0]?.name;
    if (primary === "Sci-Fi" || primary === "Science Fiction") persona = "Quantum Visionary";
    else if (primary === "Horror") persona = "Cryptkeeper";
    else if (primary === "Comedy") persona = "Sitcom Survivor";
    else if (primary === "Drama") persona = "Auteur Scholar";
    else if (primary === "Romance") persona = "Hopeless Romantic";
    else if (primary === "Action") persona = "Adrenaline Junkie";
    else if (watchedMovies.length > 100) persona = "Living Archive";

    return { topGenres, topDirectors, persona, personaColor: "#DE3151" };
  }, [likedMovies, watchedMovies]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-32 text-white">
      <div className="p-6 flex justify-between items-start">
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-6">Profile</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 hover:text-[#DE3151] transition-all"><Edit3 className="w-4 h-4" /></button>
        )}
      </div>

      <div className="px-6 mb-8">
        <motion.div layout className="relative overflow-hidden bg-zinc-900/40 border border-white/5 rounded-[2rem] p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div onClick={() => isEditing && fileInputRef.current?.click()} className={`w-28 h-28 rounded-[2rem] bg-zinc-950 border-2 overflow-hidden flex items-center justify-center ${isEditing ? 'border-[#DE3151] cursor-pointer' : 'border-zinc-800'}`}>
                {(photoPreview || profile?.avatar_url) ? <img src={photoPreview || profile?.avatar_url} className="w-full h-full object-cover" /> : <span className="text-3xl font-black">{profile ? getInitials(profile.full_name) : '??'}</span>}
                {isEditing && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Camera className="w-6 h-6 text-white opacity-80" /></div>}
              </div>
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setEditPhoto(f); const r = new FileReader(); r.onloadend = () => setPhotoPreview(r.result as string); r.readAsDataURL(f); }
              }} className="hidden" accept="image/*" />
              {!isEditing && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#DE3151] rounded-lg flex items-center justify-center border-4 border-zinc-900">
                   <Zap className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div key="edit" className="w-full space-y-4">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full Name" className="w-full bg-zinc-950 border-b border-zinc-800 focus:border-[#DE3151] text-xl font-black text-center py-2 outline-none" />
                  <div className="flex gap-3 pt-4">
                    <button onClick={() => { setIsEditing(false); setPhotoPreview(null); }} className="flex-1 h-12 bg-zinc-950 text-zinc-600 rounded-xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-[2] h-12 bg-[#DE3151] text-white rounded-xl font-black uppercase tracking-widest text-[10px]">{isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save'}</button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">{profile?.full_name}</h3>
                  <div className="px-4 py-1.5 bg-[#DE3151]/10 text-[#DE3151] rounded-full text-[9px] font-black uppercase inline-block border border-[#DE3151]/20 tracking-widest">{stats.persona}</div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Cinematic DNA - Statistics */}
      <div className="px-6 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#DE3151]" />
            Cinematic DNA
          </h4>
          <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
             <Flame className="w-3 h-3 fill-amber-500" />
             <span className="text-[9px] font-black uppercase">Elite</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
           {/* Genre Breakdown */}
           <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl">
             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-5">Genre Fluency</label>
             <div className="space-y-5">
               {stats.topGenres.length > 0 ? stats.topGenres.map((g, i) => (
                 <div key={g.name} className="space-y-2">
                   <div className="flex justify-between items-center px-1">
                     <span className="text-[10px] font-black text-white uppercase tracking-wider">{g.name}</span>
                     <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{Math.round((g.count / (watchedMovies.length || 1)) * 100)}%</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${Math.min(100, (g.count / (stats.topGenres[0]?.count || 1)) * 100)}%` }}
                       transition={{ duration: 1.2, delay: i * 0.15 }}
                       className="h-full bg-gradient-to-r from-[#DE3151] to-[#DE3151]/40" 
                     />
                   </div>
                 </div>
               )) : (
                 <p className="text-[10px] text-zinc-600 font-bold italic text-center py-4">Keep swiping to reveal your data...</p>
               )}
             </div>
           </div>

           {/* Director's Cut */}
           <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl">
             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-4">Auteur Loyalty</label>
             <div className="flex flex-wrap gap-2.5">
               {stats.topDirectors.length > 0 ? stats.topDirectors.map(d => (
                 <div key={d.name} className="px-4 py-3 bg-zinc-950 border border-white/5 rounded-2xl flex items-center gap-3 group hover:border-[#DE3151]/30 transition-all">
                   <div className="w-6 h-6 bg-zinc-900 border border-white/10 rounded-lg flex items-center justify-center text-[9px] font-black group-hover:bg-[#DE3151] group-hover:text-white transition-colors">
                     {d.count}
                   </div>
                   <span className="text-[11px] font-black text-zinc-400 group-hover:text-white transition-colors uppercase tracking-tight">{d.name}</span>
                 </div>
               )) : (
                 <p className="text-[10px] text-zinc-600 font-bold italic text-center w-full py-4">Directors you love will appear here.</p>
               )}
             </div>
           </div>
        </div>
      </div>

      {/* Letterboxd Sync */}
      <div className="px-6 mb-10">
        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">External Sync</h4>
        <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-5">
           <div className="flex items-center justify-between">
              <div>
                <h5 className="text-[11px] font-black text-white mb-1 uppercase tracking-tight">Letterboxd Network</h5>
                {isConnected ? (
                  <div className="flex items-center gap-2 text-green-500 text-[9px] font-black uppercase tracking-widest">
                    <CheckCircle2 className="w-3 h-3" /> Syncing: {letterboxdUser}
                  </div>
                ) : (
                  <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Connect for auto-diary history.</p>
                )}
              </div>
              {isConnected && (
                <button onClick={() => { setIsConnected(false); setLetterboxdUser(''); }} className="text-zinc-700 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              )}
           </div>

           {!isConnected ? (
             <div className="space-y-4">
               <input 
                 type="text" 
                 placeholder="Letterboxd Username" 
                 value={letterboxdUser} 
                 onChange={(e) => { setLetterboxdUser(e.target.value); setLetterboxdError(null); }}
                 className="w-full bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl text-xs text-white font-black outline-none focus:border-[#DE3151] transition-all"
               />
               <button onClick={handleConnect} disabled={isConnecting || !letterboxdUser} className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                 {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                 Recognize Account
               </button>
             </div>
           ) : (
             <div className="space-y-4">
               <button onClick={handleSync} disabled={isSyncing} className="w-full py-4 bg-[#DE3151] text-white rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 shadow-xl shadow-[#DE3151]/20 active:scale-95 transition-all">
                 {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                 {isSyncing ? 'Syncing...' : 'Sync History'}
               </button>
               {syncProgress && <p className="text-[9px] font-bold text-[#DE3151] uppercase text-center animate-pulse tracking-widest">{syncProgress}</p>}
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-6 mb-10">
        <div className="bg-zinc-900/40 p-6 rounded-[1.5rem] border border-white/5 shadow-xl">
          <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center gap-2 tracking-widest mb-1"><Film className="w-3 h-3" /> Seen</span>
          <span className="text-2xl font-black text-white italic">{watchedMovies.length}</span>
        </div>
        <div className="bg-zinc-900/40 p-6 rounded-[1.5rem] border border-white/5 shadow-xl">
          <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center gap-2 tracking-widest mb-1"><Star className="w-3 h-3" /> Liked</span>
          <span className="text-2xl font-black text-white italic">{likedMovies.length}</span>
        </div>
      </div>

      {/* Archive */}
      <div className="px-6 mb-10">
        <div className="flex justify-between items-end mb-6">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">The Vault</h4>
          <button onClick={onViewAllWatched} className="text-[10px] font-bold text-[#DE3151] uppercase tracking-widest underline decoration-[#DE3151]/30">Full History</button>
        </div>
        <div className="space-y-3">
          {watchedMovies.slice(0, 3).map(movie => (
            <div key={movie.id} className="flex items-center gap-4 bg-zinc-900/20 p-4 rounded-2xl border border-white/5 group">
              <div className="w-14 aspect-[2/3] rounded-lg overflow-hidden shrink-0"><img src={movie.posterUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" /></div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[11px] font-black text-white truncate uppercase tracking-tight">{movie.title}</h5>
                <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{movie.releaseYear}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-800" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 mt-10 pt-10 border-t border-white/5">
        <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-4 bg-red-600/5 text-red-600/40 rounded-xl font-black uppercase text-[9px] border border-red-600/10 tracking-widest hover:bg-red-600/10 hover:text-red-600 transition-all">Purge Local Profile</button>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-xl" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative w-full max-w-sm bg-zinc-950 border border-red-500/20 rounded-[2.5rem] p-10 text-center">
              <Trash2 className="w-10 h-10 text-red-600 mx-auto mb-6" />
              <h3 className="text-xl font-black uppercase mb-4 tracking-tighter italic">Total Wipeout?</h3>
              <p className="text-zinc-600 text-xs mb-10 font-medium">This will permanently delete your cinema DNA and interaction history from the server.</p>
              <div className="flex flex-col gap-3">
                <button onClick={async () => { setIsDeleting(true); if (await MovieService.deleteProfile(profile!.username)) onAccountDelete?.(); }} disabled={isDeleting} className="w-full py-5 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">{isDeleting ? 'Erasing...' : 'Confirm Purge'}</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 text-zinc-600 rounded-xl font-black uppercase text-[9px] tracking-widest">Keep Memories</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileSection;
