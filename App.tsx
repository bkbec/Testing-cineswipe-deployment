
import React, { useState, useEffect } from 'react';
import Logo from './components/Logo';
import DiscoverSection from './components/DiscoverSection';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';

const App: React.FC = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');

  useEffect(() => {
    const done = localStorage.getItem('cinematch_onboarded');
    if (done) setHasOnboarded(true);
  }, []);

  const handleOnboardingComplete = (data: any) => {
    localStorage.setItem('cinematch_onboarded', 'true');
    setHasOnboarded(true);
  };

  if (!hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-[100vh] w-full flex flex-col bg-black overflow-hidden relative selection:bg-[#DE3151]/30 text-white">
      {/* Header - Simplified for better aesthetics */}
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'discover' && <DiscoverSection />}
        
        {activeTab !== 'discover' && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-8">
            <div className="w-24 h-24 bg-zinc-900/50 rounded-[2.5rem] flex items-center justify-center border border-zinc-800 shadow-2xl">
              <span className="text-4xl opacity-20 grayscale">🎞️</span>
            </div>
            <div>
              <h2 className="text-3xl font-black mb-3 uppercase tracking-tight">{activeTab.replace('shared', 'Matches')}</h2>
              <p className="text-zinc-500 font-medium max-w-[240px] mx-auto leading-relaxed">This scene is currently being rendered. Check back after the next release.</p>
            </div>
            <button 
              onClick={() => setActiveTab('discover')}
              className="px-10 py-4 bg-[#DE3151]/10 border border-[#DE3151]/20 rounded-2xl text-[#DE3151] font-black text-xs uppercase tracking-[0.3em] hover:bg-[#DE3151]/20 transition-all active:scale-95"
            >
              Back to Reel
            </button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Dynamic Cinematic Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#DE3151]/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 blur-[180px] pointer-events-none rounded-full" />
    </div>
  );
};

export default App;
