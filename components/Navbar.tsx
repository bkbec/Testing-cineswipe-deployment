
import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900/90 backdrop-blur-md z-50">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center font-black text-xl italic">C</div>
        <span className="font-bold text-xl tracking-tight hidden sm:inline">CineMatch</span>
      </div>
      
      <div className="flex items-center gap-6">
        <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Discover</button>
        <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">My Lists</button>
        <div className="h-6 w-px bg-slate-800" />
        <button className="bg-slate-800 hover:bg-slate-700 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          COUPLE MODE
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <img 
          src="https://picsum.photos/seed/user/100/100" 
          alt="Profile" 
          className="w-8 h-8 rounded-full border border-slate-700"
        />
      </div>
    </nav>
  );
};

export default Navbar;
