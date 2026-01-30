
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, LogOut, Plus, Loader2, Play, Trash2, Settings2, X, Bell } from 'lucide-react';
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
  const [isManagingProfiles, setIsManagingProfiles] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const refreshProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const data = await MovieService.getAllProfiles();
      setProfiles(data);
    } catch (e) {
      console.error("Profile fetch error", e);
    } finally {
      setIsLoadingProfiles(false);
      // Only release initial load state after profiles are resolved to prevent flash
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
    if (isManagingProfiles) return;
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
    });

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
          });
        }
      }
      localStorage.setItem('user_name', finalUsername);
      setUserName(finalUsername);
      await refreshProfiles();
      setHasOnboarded(true);
    }
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
        <Logo className="w-32 h-32 mb-10 drop-shadow-[0_0_30px_rgba(222,49,81,0.6)]" />
        <h1 className="text-6xl font-black text-white tracking-tighter uppercase mb-12 italic">CineMatch</h1>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowStartPage(false)} className="px-12 py-5 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-4">
          <Play className="w-4 h-4 fill-white" />
          Enter Theater
        </motion.button>
      </div>
    );
  }

  if (!userName || userName === '__PENDING__') {
    if (userName === '__PENDING__') return <Onboarding onComplete={handleOnboardingComplete} />;
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-black text-white uppercase mb-12">Who's Watching?</h1>
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
            <div className="w-full aspect-square rounded-[2.5rem] border-2 border-dashed border-zinc-800 flex items-center justify-center hover:border-[#DE3151]"><Plus className="w-10 h-10 text-zinc-700" /></div>
            <span className="font-black text-[10px] uppercase text-zinc-700">Add Profile</span>
          </button>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="h-[100vh] w-full flex flex-col bg-black overflow-hidden relative text-white">
      <header className="flex items-center justify-between px-6 h-20 flex-shrink-0 relative z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('discover'); setIsViewingAllWatched(false); }}>
          <Logo className="w-10 h-10 drop-shadow-[0_0_10px_rgba(222,49,81,0.3)]" />
          <h1 className="font-black text-xl tracking-tighter uppercase">CineMatch</h1>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-[#DE3151]"><LogOut className="w-4 h-4" /></button>
      </header>
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'discover' && <DiscoverSection userId={userName} onInteraction={() => refreshData()} />}
        {activeTab === 'likes' && <div className="p-6 h-full overflow-y-auto no-scrollbar"><h2 className="text-3xl font-black uppercase mb-8">Favorites</h2><div className="grid grid-cols-2 gap-4">{likedMovies.map(m => <div key={m.id} className="aspect-[2/3] rounded-2xl overflow-hidden"><img src={m.posterUrl} className="w-full h-full object-cover" /></div>)}</div></div>}
        {activeTab === 'shared' && <div className="p-6 h-full overflow-y-auto no-scrollbar"><h2 className="text-3xl font-black uppercase mb-8">Shared</h2><div className="grid grid-cols-2 gap-4">{sharedMovies.map(m => <div key={m.id} className="aspect-[2/3] rounded-2xl overflow-hidden"><img src={m.posterUrl} className="w-full h-full object-cover" /></div>)}</div></div>}
        {activeTab === 'profile' && !isViewingAllWatched && <ProfileSection profile={currentProfile} likedMovies={likedMovies} watchedMovies={watchedMovies} onViewAllWatched={() => setIsViewingAllWatched(true)} onProfileUpdate={refreshProfiles} onShowToast={showToast} />}
        {activeTab === 'profile' && isViewingAllWatched && <WatchedHistoryView userId={userName} movies={watchedMovies} onBack={() => setIsViewingAllWatched(false)} onUpdate={refreshData} />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setIsViewingAllWatched(false); refreshData(); }} />
      {matchMovie && <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6"><div className="absolute inset-0 bg-[#DE3151]/20 backdrop-blur-xl" onClick={() => setMatchMovie(null)} /><div className="relative bg-zinc-950 border-4 border-[#DE3151] rounded-[3rem] p-8 text-center max-w-sm"><Sparkles className="w-12 h-12 text-[#DE3151] mx-auto mb-6" /><h2 className="text-4xl font-black uppercase mb-4 italic">Match!</h2><div className="w-full aspect-[2/3] rounded-2xl overflow-hidden mb-8"><img src={matchMovie.posterUrl} /></div><button onClick={() => setMatchMovie(null)} className="w-full py-5 bg-[#DE3151] text-white rounded-2xl font-black uppercase">Amazing!</button></div></div>}
      <AnimatePresence>{toastMsg && <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] bg-[#DE3151] text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">{toastMsg}</motion.div>}</AnimatePresence>
    </div>
  );
};

export default App;
