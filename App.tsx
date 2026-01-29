
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, LogOut, Plus, Loader2, Play, Trash2, Settings2, X } from 'lucide-react';
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
    const hasAlreadyReset = localStorage.getItem(resetKey);

    if (!hasAlreadyReset) {
      localStorage.removeItem('user_name');
      localStorage.setItem(resetKey, 'true');
      return null;
    }
    return localStorage.getItem('user_name');
  });

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

  const refreshProfiles = async () => {
    setIsLoadingProfiles(true);
    const data = await MovieService.getAllProfiles();
    setProfiles(data);
    setIsLoadingProfiles(false);
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  useEffect(() => {
    if (userName && userName !== '__PENDING__') {
      const profile = profiles.find(p => p.username === userName);
      if (profile) {
        setHasOnboarded(true);
        refreshData();
      } else {
        if (!isLoadingProfiles) setHasOnboarded(false);
      }
    }
  }, [userName, profiles, isLoadingProfiles]);

  const refreshData = async () => {
    if (!userName || userName === '__PENDING__') return;
    try {
      const interactions = await MovieService.getInteractions(userName);
      
      const likedIds = (interactions || [])
        .filter(i => i.type === InteractionType.YES)
        .map(i => String(i.movieId));
      
      const watchedIds = (interactions || [])
        .filter(i => i.type === InteractionType.WATCHED)
        .map(i => String(i.movieId));
      
      if (likedIds.length > 0) {
        const movies = await MovieService.getMoviesByIds(likedIds);
        setLikedMovies(movies || []);
      } else {
        setLikedMovies([]);
      }

      if (watchedIds.length > 0) {
        const movies = await MovieService.getMoviesByIds(watchedIds);
        setWatchedMovies(movies || []);
      } else {
        setWatchedMovies([]);
      }

      const shared = await MovieService.getSharedMatches(userName);
      setSharedMovies(shared);

    } catch (e) {
      console.error("Refresh data failed", e);
    }
  };

  const handleProfileSelect = (name: string) => {
    if (isManagingProfiles) return;
    localStorage.setItem('user_name', name);
    setUserName(name);
  };

  const handleDeleteProfile = async (profile: UserProfile) => {
    setProfileToDelete(profile);
  };

  const confirmDelete = async () => {
    if (!profileToDelete) return;
    const success = await MovieService.deleteProfile(profileToDelete.username);
    if (success) {
      if (userName === profileToDelete.username) {
        handleLogout();
      }
      await refreshProfiles();
      setProfileToDelete(null);
    } else {
      alert("Failed to delete profile.");
    }
  };

  const handleAddNewProfile = () => {
    setUserName('__PENDING__');
    setHasOnboarded(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_name');
    setUserName(null);
    setHasOnboarded(false);
    setShowStartPage(true);
    setActiveTab('discover');
    setIsManagingProfiles(false);
  };

  const handleOnboardingComplete = async (onboardingData: OnboardingData) => {
    const rawUsername = onboardingData.name.toLowerCase().replace(/\s+/g, '_');
    const finalUsername = rawUsername; 
    
    let avatarUrl = onboardingData.photoPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername}`;
    
    if (onboardingData.photoFile) {
      const uploadedUrl = await MovieService.uploadAvatar(finalUsername, onboardingData.photoFile);
      if (uploadedUrl) avatarUrl = uploadedUrl;
    }
    
    const success = await MovieService.saveProfile({
      username: finalUsername,
      full_name: onboardingData.name,
      avatar_url: avatarUrl
    });

    if (success) {
      if (onboardingData.masterpieces?.length > 0) {
        // Fetch movie details for all selected masterpieces to ensure accurate titles/posters
        const masterpieces = await MovieService.getMoviesByIds(onboardingData.masterpieces);
        for (const movie of masterpieces) {
          await MovieService.submitInteraction({
            userId: finalUsername,
            movieId: String(movie.id),
            title: movie.title,
            posterUrl: movie.posterUrl,
            type: InteractionType.WATCHED, // Now added to WATCHED list instead of LIKED
            timestamp: Date.now(),
            notes: 'Selected as Masterpiece during onboarding'
          });
        }
      }

      localStorage.setItem('user_name', finalUsername);
      setUserName(finalUsername);
      await refreshProfiles();
      setHasOnboarded(true);
      refreshData();
    } else {
      alert("Failed to create profile. Please try again.");
    }
  };

  const handleDiscoverInteraction = useCallback(async (movieId: string, type: InteractionType) => {
    if (type === InteractionType.YES && userName) {
      const isMatch = await MovieService.checkForMatches(movieId, userName);
      if (isMatch) {
        const movies = await MovieService.getMoviesByIds([movieId]);
        if (movies && movies.length > 0) {
          setMatchMovie(movies[0]);
          const shared = await MovieService.getSharedMatches(userName);
          setSharedMovies(shared);
        }
      }
    }
    refreshData();
  }, [userName]);

  const currentProfile = profiles.find(p => p.username === userName);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (showStartPage && !userName) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-[#DE3151]/10 blur-[150px] pointer-events-none rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-white/5 blur-[150px] pointer-events-none rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10 flex flex-col items-center"
        >
          <Logo className="w-32 h-32 mx-auto mb-10 drop-shadow-[0_0_30px_rgba(222,49,81,0.6)]" />
          <h1 className="text-6xl font-black text-white tracking-tighter uppercase mb-2 italic">CineMatch</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.4em] text-[10px] mb-12">Personalized Discovery</p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowStartPage(false)}
            className="group relative px-12 py-5 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-[0_0_40px_rgba(222,49,81,0.3)] flex items-center gap-4 transition-all hover:brightness-110"
          >
            <Play className="w-4 h-4 fill-white" />
            Enter Theater
          </motion.button>
        </motion.div>

        <div className="absolute bottom-12 left-0 right-0 text-center">
          <span className="text-[9px] font-black text-white uppercase tracking-[0.5em] opacity-50">Build Version {APP_VERSION}</span>
        </div>
      </div>
    );
  }

  if (!userName || userName === '__PENDING__') {
    if (userName === '__PENDING__') {
       return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#DE3151]/20 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 blur-[150px] pointer-events-none rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 relative z-10"
        >
          <Logo className="w-16 h-16 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(222,49,81,0.5)]" />
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Welcome Back</h1>
          <p className="text-zinc-500 font-medium">Who's picking the movie tonight?</p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 w-full max-w-2xl relative z-10 px-4">
          {isLoadingProfiles ? (
            <Loader2 className="w-8 h-8 animate-spin text-[#DE3151]" />
          ) : (
            profiles.map(profile => (
              <motion.div
                key={profile.username}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group w-32"
              >
                <motion.button
                  whileHover={!isManagingProfiles ? { scale: 1.05, y: -5 } : {}}
                  whileTap={!isManagingProfiles ? { scale: 0.95 } : {}}
                  onClick={() => handleProfileSelect(profile.username)}
                  className={`group flex flex-col items-center gap-4 w-full transition-all ${isManagingProfiles ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
                >
                  <div className={`w-full aspect-square rounded-[2.5rem] bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center overflow-hidden relative shadow-2xl ${!isManagingProfiles ? 'group-hover:border-[#DE3151]' : ''}`}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                    ) : (
                      <span className="text-2xl font-black text-white">{getInitials(profile.full_name)}</span>
                    )}
                    <div className={`absolute inset-0 bg-black/40 transition-colors ${!isManagingProfiles ? 'group-hover:bg-transparent' : ''}`} />
                  </div>
                  <span className="font-black text-xs uppercase tracking-[0.3em] text-zinc-500 transition-colors truncate w-full text-center group-hover:text-white">{profile.full_name}</span>
                </motion.button>
                
                {isManagingProfiles && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteProfile(profile)}
                    className="absolute -top-2 -right-2 w-10 h-10 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-2xl z-20 border-2 border-black"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                )}
              </motion.div>
            ))
          )}

          <div className="flex flex-col items-center gap-8">
            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddNewProfile}
              className="group flex flex-col items-center gap-4 w-32"
            >
              <div className="w-full aspect-square rounded-[2.5rem] bg-zinc-950 border-2 border-dashed border-zinc-800 flex items-center justify-center group-hover:border-[#DE3151] group-hover:bg-[#DE3151]/5 transition-all shadow-2xl relative">
                <Plus className="w-10 h-10 text-zinc-700 group-hover:text-[#DE3151]" />
              </div>
              <span className="font-black text-[10px] uppercase tracking-[0.2em] text-zinc-700 group-hover:text-white transition-colors">Add Profile</span>
            </motion.button>

            <motion.button
              onClick={() => setIsManagingProfiles(!isManagingProfiles)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${isManagingProfiles ? 'bg-[#DE3151] border-[#DE3151] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
            >
              <Settings2 className="w-4 h-4" />
              {isManagingProfiles ? 'Done Managing' : 'Manage Profiles'}
            </motion.button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {profileToDelete && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setProfileToDelete(null)} />
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
                <div className="w-20 h-20 bg-red-600/10 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Delete Profile?</h3>
                <p className="text-zinc-500 text-sm mb-8 leading-relaxed">This will permanently remove <span className="text-white font-bold">{profileToDelete.full_name}</span> and all their movie preferences. This cannot be undone.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">Confirm Delete</button>
                  <button onClick={() => setProfileToDelete(null)} className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const renderListView = (title: string, movies: Movie[], emptyMsg: string) => {
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar pb-32">
        <div className="mb-8">
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-0.5 block">Collection</span>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{title}</h2>
        </div>
        
        {movies.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl mb-8">🍿</div>
            <p className="text-zinc-500 font-medium max-w-[200px] leading-relaxed">{emptyMsg}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {movies.map(movie => (
              <div key={movie.id} className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shadow-xl group">
                <img src={movie.posterUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={movie.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                  <span className="text-[10px] font-black text-white truncate">{movie.title}</span>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{movie.releaseYear}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[100vh] w-full flex flex-col bg-black overflow-hidden relative selection:bg-[#DE3151]/30 text-white">
      <header className="flex items-center justify-between px-6 h-20 flex-shrink-0 relative z-50 mt-1">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setActiveTab('discover'); setIsViewingAllWatched(false); }}>
          <Logo className="w-10 h-10 transition-transform group-hover:scale-110 drop-shadow-[0_0_10px_rgba(222,49,81,0.3)]" />
          <h1 className="font-black text-xl tracking-tighter uppercase leading-none">CineMatch</h1>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="relative group">
              <div 
                onClick={() => setActiveTab('profile')}
                className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#DE3151] transition-all"
              >
                {currentProfile?.avatar_url ? (
                  <img 
                    src={currentProfile.avatar_url} 
                    className="w-full h-full object-cover" 
                    alt="Profile" 
                  />
                ) : (
                  <span className="text-[10px] font-black text-white">
                    {currentProfile ? getInitials(currentProfile.full_name) : '??'}
                  </span>
                )}
              </div>
           </div>

           <button 
             onClick={handleLogout}
             className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-[#DE3151] transition-all active:scale-95 hover:bg-[#DE3151]/10"
             title="Logout"
           >
             <LogOut className="w-4 h-4" />
           </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'discover' && (
          <DiscoverSection userId={userName} onInteraction={handleDiscoverInteraction} />
        )}
        {activeTab === 'likes' && renderListView('My Favorites', likedMovies, 'Films you marked with a heart.')}
        {activeTab === 'shared' && renderListView('Shared Likes', sharedMovies, 'Films you and your partner both want to see!')}
        {activeTab === 'profile' && !isViewingAllWatched && (
          <ProfileSection 
            profile={currentProfile}
            likedMovies={likedMovies} 
            watchedMovies={watchedMovies} 
            onViewAllWatched={() => setIsViewingAllWatched(true)}
            onProfileUpdate={refreshProfiles}
            onAccountDelete={() => {
              handleLogout();
              refreshProfiles();
            }}
          />
        )}
        {activeTab === 'profile' && isViewingAllWatched && (
          <WatchedHistoryView 
            userId={userName}
            movies={watchedMovies} 
            onBack={() => setIsViewingAllWatched(false)}
            onUpdate={() => refreshData()}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={(tab) => { 
        setActiveTab(tab); 
        setIsViewingAllWatched(false);
        refreshData(); 
      }} />

      <AnimatePresence>
        {matchMovie && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#DE3151]/20 backdrop-blur-xl" onClick={() => setMatchMovie(null)} />
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 50 }} className="relative bg-zinc-950 border-4 border-[#DE3151] rounded-[3rem] p-8 w-full max-sm:p-6 max-w-sm text-center shadow-[0_0_100px_rgba(222,49,81,0.5)]">
              <div className="w-20 h-20 bg-[#DE3151] rounded-3xl mx-auto mb-6 flex items-center justify-center rotate-12 shadow-2xl">
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2 italic">Match!</h2>
              <p className="text-zinc-400 font-medium mb-8 leading-relaxed">Someone else wants to watch <span className="text-white font-bold">{matchMovie.title}</span> too! 🍿</p>
              <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden mb-8 border border-white/10">
                <img src={matchMovie.posterUrl} className="w-full h-full object-cover" />
              </div>
              <button onClick={() => setMatchMovie(null)} className="w-full py-5 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all">Amazing!</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#DE3151]/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 blur-[180px] pointer-events-none rounded-full" />
    </div>
  );
};

export default App;
