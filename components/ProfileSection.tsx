
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clapperboard, Film, Trophy, Clock, ChevronRight, Edit3, Camera, Check, X, Loader2, Plus, Trash2, AlertTriangle, RefreshCw, CheckCircle2, AlertCircle, BarChart3, Users, Zap, Flame, UploadCloud, FileText } from 'lucide-react';
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
  
  // CSV Import States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [syncPercent, setSyncPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name);
    }
  }, [profile]);

  const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        setCsvFile(file);
        setError(null);
      } else {
        setError("Invalid file. Please use .csv");
      }
    }
  };

  const handleSyncCSV = async () => {
    if (!profile || !csvFile) return;
    setIsSyncing(true);
    setSyncPercent(0);
    try {
      const count = await MovieService.syncLetterboxdCSV(
        csvFile, 
        profile.username,
        (msg, percent) => {
          setSyncProgress(msg);
          setSyncPercent(percent);
        }
      );
      if (onShowToast) onShowToast(`Successfully imported ${count} films!`);
      setCsvFile(null);
      onProfileUpdate();
    } catch (err: any) {
      setError("Import failed. Ensure valid CSV.");
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

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const stats = useMemo(() => {
    const allInteracted = [...likedMovies, ...watchedMovies];
    const genreCounts: Record<string, number> = {};
    allInteracted.forEach(m => m.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
    const sortedGenres = Object.entries(genreCounts).sort(([, a], [, b]) => b - a);
    const topGenres = sortedGenres.slice(0, 4).map(([name, count]) => ({ name, count }));
    
    // Calculate top directors based ONLY on Liked movies
    const directorCounts: Record<string, number> = {};
    likedMovies.forEach(m => { 
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
              <div onClick={() => isEditing && fileInputRef.current?.click()} className={`w-28 h-28 rounded-[2.5rem] bg-zinc-950 border-2 overflow-hidden flex items-center justify-center ${isEditing ? 'border-[#DE3151] cursor-pointer' : 'border-zinc-800'}`}>
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

      <div className="px-6 mb-10">
        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-[#DE3151]" />
          Cinematic DNA
        </h4>
        <div className="grid grid-cols-1 gap-4">
           {/* Genre Fluency Card */}
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
                     <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (g.count / (stats.topGenres[0]?.count || 1)) * 100)}%` }} transition={{ duration: 1.2, delay: i * 0.15 }} className="h-full bg-gradient-to-r from-[#DE3151] to-[#DE3151]/40" />
                   </div>
                 </div>
               )) : (
                 <p className="text-[10px] text-zinc-600 font-bold italic text-center py-4">Swipe to reveal your data...</p>
               )}
             </div>
           </div>

           {/* Favourite Directors Card */}
           <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl">
             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-5">Auteur Affinity</label>
             <div className="space-y-4">
               {stats.topDirectors.length > 0 ? stats.topDirectors.map((d, i) => (
                 <div key={d.name} className="flex items-center justify-between group">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-[#DE3151] border border-white/5">
                        <Clapperboard className="w-3.5 h-3.5" />
                     </div>
                     <span className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[180px]">{d.name}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="text-[9px] font-bold text-zinc-600 uppercase">{d.count} {d.count === 1 ? 'Film' : 'Films'}</span>
                   </div>
                 </div>
               )) : (
                 <p className="text-[10px] text-zinc-600 font-bold italic text-center py-4">Like movies to see top directors...</p>
               )}
             </div>
           </div>
        </div>
      </div>

      {/* CSV Sync Section */}
      <div className="px-6 mb-10">
        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Letterboxd Vault</h4>
        <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-6">
           <div 
             onClick={() => !isSyncing && csvInputRef.current?.click()}
             className={`p-6 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center cursor-pointer ${csvFile ? 'border-[#DE3151] bg-[#DE3151]/5' : error ? 'border-red-500/30' : 'border-zinc-800 hover:border-[#DE3151]/20'}`}
           >
             {csvFile ? (
               <div className="flex items-center gap-3">
                 <FileText className="w-5 h-5 text-[#DE3151]" />
                 <span className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{csvFile.name}</span>
               </div>
             ) : (
               <div className="flex flex-col items-center gap-2">
                 <UploadCloud className="w-6 h-6 text-zinc-700" />
                 <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Import watched.csv</span>
               </div>
             )}
             <input type="file" ref={csvInputRef} onChange={handleCSVSelect} accept=".csv" className="hidden" />
           </div>

           {error && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest text-center">{error}</p>}

           {isSyncing ? (
             <div className="space-y-3">
                <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${syncPercent}%` }} className="h-full bg-[#DE3151]" />
                </div>
                <p className="text-[8px] font-black text-[#DE3151] uppercase tracking-[0.2em] text-center animate-pulse truncate">{syncProgress}</p>
             </div>
           ) : csvFile && (
             <button onClick={handleSyncCSV} className="w-full py-4 bg-[#DE3151] text-white rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 shadow-xl shadow-[#DE3151]/20 active:scale-95 transition-all">
               <RefreshCw className="w-3.5 h-3.5" /> Start Import
             </button>
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
