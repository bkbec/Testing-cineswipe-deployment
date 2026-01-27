import React, { useState, useEffect } from 'react';
import Logo from './components/Logo';
import DiscoverSection from './components/DiscoverSection';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import { MovieService } from './services/movieService';
import { Movie, InteractionType } from './types';

const App: React.FC = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);

  useEffect(() => {
    // Debug Log as requested
    // @ts-ignore - for environments that don't recognize import.meta.env
    console.log("API Key Check:", !!(typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_TMDB_API_KEY : false));
    
    const done = localStorage.getItem('cinematch_onboarded');
    if (done) setHasOnboarded(true);
    refreshLikes();
  }, []);

  const refreshLikes = async () => {
    try {
      const interactions = MovieService.getInteractions();
      const likedIds = (interactions || [])
        .filter(i => i.type === InteractionType.YES)
        .map(i => i.movieId);
      
      if (likedIds.length > 0) {
        const movies = await MovieService.getMoviesByIds(likedIds);
        setLikedMovies(movies || []);
      } else {
        setLikedMovies([]);
      }
    } catch (e) {
      console.error("Refresh likes failed", e);
      setLikedMovies([]);
    }
  };

  const handleOnboardingComplete = (data: any) => {
    localStorage.setItem('cinematch_onboarded', 'true');
    setHasOnboarded(true);
  };

  if (!hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const renderListView = (title: string, emptyMsg: string) => {
    const currentLikes = likedMovies || [];
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar pb-32">
        <div className="mb-8">
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-0.5 block">Collection</span>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{title}</h2>
        </div>
        
        {currentLikes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-3xl opacity-30 grayscale">🎞️</div>
            <p className="text-zinc-500 font-medium max-w-[200px] leading-relaxed">{emptyMsg}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {currentLikes.map(movie => (
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
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('discover')}>
          <Logo className="w-10 h-10 transition-transform group-hover:scale-110 drop-shadow-[0_0_10px_rgba(222,49,81,0.3)]" />
          <h1 className="font-black text-xl tracking-tighter uppercase leading-none">CineMatch</h1>
        </div>
        
        <div className="flex items-center">
           <div className="flex -space-x-3">
             <img src="https://picsum.photos/seed/p1/100/100" className="w-10 h-10 rounded-full border-4 border-black object-cover shadow-xl" />
             <img src="https://picsum.photos/seed/p2/100/100" className="w-10 h-10 rounded-full border-4 border-black object-cover shadow-xl" />
           </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'discover' && <DiscoverSection onInteraction={refreshLikes} />}
        {activeTab === 'likes' && renderListView('My Favorites', 'Keep swiping to build your collection of movies you want to see.')}
        {activeTab === 'shared' && renderListView('Shared Likes', 'Movies both of you liked will appear here for movie night.')}
        {activeTab === 'profile' && renderListView('Profile History', 'Your full history of seen and liked films.')}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); refreshLikes(); }} />
      
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#DE3151]/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 blur-[180px] pointer-events-none rounded-full" />
    </div>
  );
};

export default App;

import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}