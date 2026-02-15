
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, LogOut, Plus, Loader2, Play, Trash2, Settings2, X, Bell, Eye, Heart, Info, Clock, User, Clapperboard, Star } from 'lucide-react';
import Logo from './components/Logo';
import DiscoverSection from './components/DiscoverSection';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import ProfileSection from './components/ProfileSection';
import WatchedHistoryView from './components/WatchedHistoryView';
import { MovieService } from './services/movieService';
import { Movie, InteractionType, OnboardingData, UserProfile } from './types';
import { APP_VERSION } from './constants';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(() => {
    const resetKey = `has_reset_to_${APP_VERSION}`;
    if (!localStorage.getItem(resetKey)) {
      localStorage.removeItem('user_name');
      localStorage.setItem(resetKey, 'true');
      return null;
    }
    return localStorage.getItem('user_name');
  });

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showStartPage, setShowStartPage] = useState(!userName);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');
  const [isViewingAllWatched, setIsViewingAllWatched] = useState(false);
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<Movie[]>([]);
  const [sharedMovies, setSharedMovies] = useState<Movie[]>([]);
  const [matchMovie, setMatchMovie] = useState<Movie | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // New detail modal state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isProcessingInteraction, setIsProcessingInteraction] = useState(false);

  const refreshProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const data = await MovieService.getAllProfiles();
      setProfiles(data);
    } catch (e) {
      console.error("Profile fetch error", e);
    } finally {
      setIsLoadingProfiles(false);
      setTimeout(() => setIsInitialLoad(false), 800);
    }
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  useEffect(() => {
    if (userName && userName !== '__PENDING__' && !isLoadingProfiles) {
      const profile = profiles.find(p => p.username === userName);
      if (profile) {
        setHasOnboarded(true);
        refreshData();
      } else {
        setHasOnboarded(false);
      }
    }
  }, [userName, profiles, isLoadingProfiles]);

  const refreshData = async () => {
    if (!userName || userName === '__PENDING__') return;
    try {
      const interactions = await MovieService.getInteractions(userName);
      const likedIds = interactions.filter(i => i.type === InteractionType.YES).map(i => String(i.movieId));
      const watchedIds = interactions.filter(i => i.type === InteractionType.WATCHED).map(i => String(i.movieId));
      
      const [liked, watched, shared] = await Promise.all([
        MovieService.getMoviesByIds(likedIds),
        MovieService.getMoviesByIds(watchedIds),
        MovieService.getSharedMatches(userName)
      ]);
      
      setLikedMovies(liked || []);
      setWatchedMovies(watched || []);
      setSharedMovies(shared || []);
    } catch (e) {
      console.error("Data refresh failed", e);
    }
  };

  const handleProfileSelect = (name: string) => {
    localStorage.setItem('user_name', name);
    setUserName(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_name');
    setUserName(null);
    setHasOnboarded(false);
    setShowStartPage(true);
    setActiveTab('discover');
  };

  const handleOnboardingComplete = async (onboardingData: OnboardingData) => {
    const finalUsername = onboardingData.name.toLowerCase().replace(/\s+/g, '_');
    let avatarUrl = onboardingData.photoPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername}`;
    
    if (onboardingData.photoFile) {
      const uploadedUrl = await MovieService.uploadAvatar(finalUsername, onboardingData.photoFile);
      if (uploadedUrl) avatarUrl = uploadedUrl;
    }
    
    const success = await MovieService.saveProfile({
      username: finalUsername,
      full_name: onboardingData.name,
      avatar_url: avatarUrl,
      letterboxd_username: onboardingData.letterboxdUsername
    }, onboardingData); // Passing onboardingData here

    if (success) {
      if (onboardingData.masterpieces?.length > 0) {
        const masterpieces = await MovieService.getMoviesByIds(onboardingData.masterpieces);
        for (const movie of masterpieces) {
          await MovieService.submitInteraction({
            userId: finalUsername,
            movieId: String(movie.id),
            title: movie.title,
            posterUrl: movie.posterUrl,
            type: InteractionType.WATCHED,
            timestamp: Date.now(),
            personalRating: 5 // Masterpieces from onboarding get automatic 5-star for AI training
          });
        }
      }
      localStorage.setItem('user_name', finalUsername);
      setUserName(finalUsername);
      await refreshProfiles();
      setHasOnboarded(true);
    }
  };

  const handleRemoveFromLikes = async (movie: Movie) => {
    if (!userName || isProcessingInteraction) return;
    setIsProcessingInteraction(true);
    try {
      const success = await MovieService.deleteInteraction(userName, movie.id);
      if (success) {
        setSelectedMovie(null);
        showToast(`Removed "${movie.title}" from Likes`);
        await refreshData();
      }
    } finally {
      setIsProcessingInteraction(false);
    }
  };

  const handleMarkAsWatched = async (movie: Movie) => {
    if (!userName || isProcessingInteraction) return;
    setIsProcessingInteraction(true);
    try {
      const success = await MovieService.submitInteraction({
        userId: userName,
        movieId: movie.id,
        title: movie.title,
        posterUrl: movie.posterUrl,
        type: InteractionType.WATCHED,
        timestamp: Date.now()
      });
      if (success) {
        setSelectedMovie(null);
        showToast(`Moved "${movie.title}" to Watched`);
        await refreshData();
      }
    } finally {
      setIsProcessingInteraction(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const currentProfile = profiles.find(p => p.username === userName);

  if (isInitialLoad) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[1000]">
        <Logo className="w-24 h-24 mb-10 animate-pulse drop-shadow-[0_0_20px_rgba(222,49,81,0.5)]" />
        <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
          <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1/2 h-full bg-[#DE3151]" />
        </div>
      </div>
    );
  }

  if (showStartPage && !userName) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="flex flex-col items-center text-center"
        >
          <Logo className="w-10 h-10 mb-8 drop-shadow-[0_0_15px_rgba(222,49,81,0.2)]" />
          <h1 className="text-[10px] font-black text-zinc-500 tracking-[1em] uppercase mb-20 pl-[1em]">CineMatch</h1>
          <motion.button 
            whileHover={{ scale: 1.02, brightness: 1.1 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={() => setShowStartPage(false)} 
            className="px-10 py-3.5 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[9px] shadow-2xl shadow-[#DE3151]/20 transition-all duration-500"
          >
            Enter Theater
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (!userName || userName === '__PENDING__') {
    if (userName === '__PENDING__') return <Onboarding onComplete={handleOnboardingComplete} />;
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-black text-white uppercase mb-12 tracking-tighter">Who's Watching?</h1>
        <div className="flex flex-wrap justify-center gap-8 max-w-2xl">
          {profiles.map(p => (
            <button key={p.username} onClick={() => handleProfileSelect(p.username)} className="flex flex-col items-center gap-4 w-32">
              <div className="w-full aspect-square rounded-[2.5rem] bg-zinc-900 border-2 border-zinc-800 overflow-hidden hover:border-[#DE3151] transition-all">
                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-black">{p.full_name[0]}</span>}
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest text-zinc-500">{p.full_name}</span>
            </button>
          ))}
          <button onClick={() => setUserName('__PENDING__')} className="flex flex-col items-center gap-4 w-32">
            <div className="w-full aspect-square rounded-[2.5rem] border-2 border-dashed border-zinc-800 flex items-center justify-center hover:border-[#DE3151] transition-all"><Plus className="w-10 h-10 text-zinc-700" /></div>
            <span className="font-black text-[10px] uppercase text-zinc-700">Add Profile</span>
          </button>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="h-[100vh] w-full flex flex-col bg-black overflow-hidden relative text-white">
      <header className="flex items-center justify-between px-6 h-20 flex-shrink-0 relative z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('discover'); setIsViewingAllWatched(false); refreshData(); }}>
          <Logo className="w-10 h-10 drop-shadow-[0_0_10px_rgba(222,49,81,0.3)]" />
          <h1 className="font-black text-xl tracking-tighter uppercase italic">CineMatch</h1>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-[#DE3151] active:scale-90 transition-all"><LogOut className="w-4 h-4" /></button>
      </header>
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'discover' && <DiscoverSection userId={userName} onInteraction={() => refreshData()} />}
        
        {activeTab === 'likes' && (
          <div className="p-6 h-full overflow-y-auto no-scrollbar">
            <h2 className="text-3xl font-black uppercase mb-8 italic tracking-tighter">Favorites</h2>
            <div className="grid grid-cols-2 gap-4 pb-32">
              {likedMovies.map(m => (
                <motion.button 
                  key={m.id} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMovie(m)}
                  className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative group"
                >
                  <img src={m.posterUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Info className="w-8 h-8 text-white" />
                  </div>
                </motion.button>
              ))}
              {likedMovies.length === 0 && (
                <div className="col-span-2 text-center py-20">
                  <Heart className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No likes yet. Keep swiping!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'shared' && (
          <div className="p-6 h-full overflow-y-auto no-scrollbar">
            <h2 className="text-3xl font-black uppercase mb-8 italic tracking-tighter">Shared</h2>
            <div className="grid grid-cols-2 gap-4 pb-32">
              {sharedMovies.map(m => (
                <motion.button 
                  key={m.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMovie(m)}
                  className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative group"
                >
                  <img src={m.posterUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Info className="w-8 h-8 text-white" />
                  </div>
                </motion.button>
              ))}
              {sharedMovies.length === 0 && (
                <div className="col-span-2 text-center py-20">
                  <Sparkles className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No shared matches found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && !isViewingAllWatched && <ProfileSection profile={currentProfile} likedMovies={likedMovies} watchedMovies={watchedMovies} onViewAllWatched={() => setIsViewingAllWatched(true)} onProfileUpdate={refreshProfiles} onShowToast={showToast} />}
        {activeTab === 'profile' && isViewingAllWatched && <WatchedHistoryView userId={userName} movies={watchedMovies} onBack={() => setIsViewingAllWatched(false)} onUpdate={refreshData} />}
      </main>
      
      <BottomNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setIsViewingAllWatched(false); refreshData(); }} />

      {/* Shared Match Success Overlay */}
      {matchMovie && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#DE3151]/20 backdrop-blur-xl" onClick={() => setMatchMovie(null)} />
          <div className="relative bg-zinc-950 border-4 border-[#DE3151] rounded-[3rem] p-8 text-center max-w-sm">
            <Sparkles className="w-12 h-12 text-[#DE3151] mx-auto mb-6" />
            <h2 className="text-4xl font-black uppercase mb-4 italic tracking-tighter">Match!</h2>
            <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden mb-8 shadow-2xl">
              <img src={matchMovie.posterUrl} className="w-full h-full object-cover" />
            </div>
            <button onClick={() => setMatchMovie(null)} className="w-full py-5 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-widest text-xs">Amazing!</button>
          </div>
        </div>
      )}

      {/* Movie Detail Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessingInteraction && setSelectedMovie(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-zinc-950 border-t border-white/5 rounded-t-[3rem] p-8 pb-12 shadow-[0_-20px_60px_rgba(222,49,81,0.3)] flex flex-col overflow-y-auto max-h-[90vh] no-scrollbar"
            >
              <div className="w-16 h-1 bg-zinc-800 rounded-full mx-auto mb-8 shrink-0" />
              
              <div className="flex gap-6 mb-8 shrink-0">
                <div className="w-32 aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 shadow-2xl shrink-0">
                  <img src={selectedMovie.posterUrl} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-black text-[#DE3151] uppercase tracking-[0.4em] mb-1 block">{selectedMovie.releaseYear}</span>
                  <h3 className="text-2xl font-black text-white tracking-tighter mb-4 uppercase italic leading-tight">{selectedMovie.title}</h3>
                  
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-md border border-white/5">
                       <Star className="w-3 h-3 text-[#00E054] fill-[#00E054]" />
                       <span className="text-[10px] font-black text-white">{selectedMovie.ratings.letterboxd}</span>
                    </div>
                    {selectedMovie.ratings.rottenTomatoesCritic !== 'N/A' && (
                      <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-md border border-white/5">
                         <img src="https://www.rottentomatoes.com/assets/cas/images/static/icons/fresh.svg" className="w-3 h-3" alt="RT" />
                         <span className="text-[10px] font-black text-white">{selectedMovie.ratings.rottenTomatoesCritic}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                {selectedMovie.curationLogic && (
                  <div className="bg-[#DE3151]/10 border border-[#DE3151]/20 p-4 rounded-xl">
                    <span className="text-[8px] font-black text-[#DE3151] uppercase tracking-widest block mb-1">Algorithmic Insight</span>
                    <p className="text-zinc-200 text-[10px] italic font-medium">"{selectedMovie.curationLogic}"</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest block mb-2">Synopsis</label>
                  <p className="text-zinc-400 text-xs font-medium leading-relaxed">{selectedMovie.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/5">
                     <div className="flex items-center gap-2 mb-1.5 text-zinc-600">
                       <Clapperboard className="w-3 h-3" />
                       <span className="text-[8px] font-black uppercase tracking-widest">Director</span>
                     </div>
                     <span className="text-zinc-200 text-[11px] font-bold truncate block">{selectedMovie.director || 'N/A'}</span>
                  </div>
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/5">
                     <div className="flex items-center gap-2 mb-1.5 text-zinc-600">
                       <Clock className="w-3 h-3" />
                       <span className="text-[8px] font-black uppercase tracking-widest">Runtime</span>
                     </div>
                     <span className="text-zinc-200 text-[11px] font-bold">{selectedMovie.runtime || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Interaction Actions */}
              <div className="flex flex-col gap-3 shrink-0">
                <button 
                  onClick={() => handleMarkAsWatched(selectedMovie)}
                  disabled={isProcessingInteraction}
                  className="w-full py-5 bg-zinc-100 text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
                >
                  <Eye className="w-5 h-5" />
                  Mark as Watched
                </button>
                <button 
                  onClick={() => handleRemoveFromLikes(selectedMovie)}
                  disabled={isProcessingInteraction}
                  className="w-full py-5 bg-zinc-900 text-red-500 border border-red-500/20 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove from Likes
                </button>
                <button 
                  onClick={() => setSelectedMovie(null)}
                  disabled={isProcessingInteraction}
                  className="w-full py-4 text-zinc-600 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toastMsg && <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] bg-[#DE3151] text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">{toastMsg}</motion.div>}</AnimatePresence>
    </div>
  );
};

export default App;
