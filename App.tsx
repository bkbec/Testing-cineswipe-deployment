
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import Logo from './components/Logo';
import DiscoverSection from './components/DiscoverSection';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import ProfileSection from './components/ProfileSection';
import WatchedHistoryView from './components/WatchedHistoryView';
import { MovieService } from './services/movieService';
import { Movie, InteractionType, OnboardingData } from './types';

const App: React.FC = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');
  const [isViewingAllWatched, setIsViewingAllWatched] = useState(false);
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<Movie[]>([]);
  const [matchMovie, setMatchMovie] = useState<Movie | null>(null);

  // Persistence: Generate or load a sticky userId
  const [userId] = useState(() => {
    const existing = localStorage.getItem('cinematch_user_id');
    if (existing) return existing;
    const newId = `user_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cinematch_user_id', newId);
    return newId;
  });

  // Debugging: Verify Supabase environment keys
  useEffect(() => {
    try {
      const urlExists = typeof process !== 'undefined' && !!process.env?.VITE_SUPABASE_URL;
      const keyExists = typeof process !== 'undefined' && !!process.env?.VITE_SUPABASE_ANON_KEY;
      console.log("Supabase URL Check:", urlExists);
      console.log("Supabase Key Check:", keyExists);
    } catch (e) {
      console.warn("Could not check environment variables", e);
    }
  }, []);

  useEffect(() => {
    const done = localStorage.getItem('cinematch_onboarded');
    if (done) {
      setHasOnboarded(true);
      refreshData();
    }
  }, [userId]);

  const refreshData = async () => {
    try {
      const interactions = await MovieService.getInteractions(userId);
      
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
    } catch (e) {
      console.error("Refresh data failed", e);
    }
  };

  const handleOnboardingComplete = async (onboardingData: OnboardingData) => {
    localStorage.setItem('cinematch_onboarding_data', JSON.stringify(onboardingData));
    
    if (onboardingData.masterpieces?.length > 0) {
      const masterpieces = await MovieService.getTrendingForOnboarding();
      for (const mId of onboardingData.masterpieces) {
        const fullMovieData = masterpieces.find(m => m.id === mId);
        await MovieService.submitInteraction({
          userId,
          user_name: 'User1', // Defaulting as requested
          movieId: String(mId),
          title: fullMovieData?.title,
          posterUrl: fullMovieData?.posterUrl,
          type: InteractionType.YES,
          timestamp: Date.now()
        });
      }
    }

    localStorage.setItem('cinematch_onboarded', 'true');
    setHasOnboarded(true);
    refreshData();
  };

  const handleDiscoverInteraction = async (movieId: string, type: InteractionType) => {
    const safeMovieId = String(movieId);
    if (type === InteractionType.YES) {
      const isMatch = await MovieService.checkForMatches(safeMovieId, userId);
      if (isMatch) {
        const movies = await MovieService.getMoviesByIds([safeMovieId]);
        if (movies && movies[0]) {
          setMatchMovie(movies[0]);
        }
      }
    }
    refreshData();
  };

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
            <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-3xl opacity-30 grayscale">🎞️</div>
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
        
        <div className="flex items-center">
           <div className="flex -space-x-3">
             <img src="https://picsum.photos/seed/p1/100/100" className="w-10 h-10 rounded-full border-4 border-black object-cover shadow-xl" />
             <div className="w-10 h-10 rounded-full border-4 border-black bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500 overflow-hidden">
                {userId.slice(-2).toUpperCase()}
             </div>
           </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'discover' && (
          <DiscoverSection 
            userId={userId} 
            onInteraction={handleDiscoverInteraction} 
          />
        )}
        {activeTab === 'likes' && renderListView('My Favorites', likedMovies, 'Films you marked with a heart. Perfect for tonight.')}
        {activeTab === 'shared' && renderListView('Shared Likes', [], 'Connect with a partner to see movies both of you liked!')}
        {activeTab === 'profile' && !isViewingAllWatched && (
          <ProfileSection 
            likedMovies={likedMovies} 
            watchedMovies={watchedMovies} 
            onViewAllWatched={() => setIsViewingAllWatched(true)}
          />
        )}
        {activeTab === 'profile' && isViewingAllWatched && (
          <WatchedHistoryView 
            userId={userId}
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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#DE3151]/20 backdrop-blur-xl"
              onClick={() => setMatchMovie(null)}
            />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="relative bg-zinc-950 border-4 border-[#DE3151] rounded-[3rem] p-8 w-full max-sm:p-6 max-w-sm text-center shadow-[0_0_100px_rgba(222,49,81,0.5)]"
            >
              <div className="w-20 h-20 bg-[#DE3151] rounded-3xl mx-auto mb-6 flex items-center justify-center rotate-12 shadow-2xl">
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2 italic">Match!</h2>
              <p className="text-zinc-400 font-medium mb-8 leading-relaxed">Someone else wants to watch <span className="text-white font-bold">{matchMovie.title}</span> too! 🍿</p>
              
              <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden mb-8 border border-white/10">
                <img src={matchMovie.posterUrl} className="w-full h-full object-cover" />
              </div>

              <button 
                onClick={() => setMatchMovie(null)}
                className="w-full py-5 bg-[#DE3151] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-transform"
              >
                Amazing!
              </button>
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
