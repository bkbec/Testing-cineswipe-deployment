
import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Heart, Users, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'likes', label: 'My Likes', icon: Heart },
    { id: 'shared', label: 'Shared', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2">
      <div className="max-w-md mx-auto glass rounded-3xl p-2 flex justify-between items-center shadow-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onPointerDown={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 transition-all relative outline-none ${
                isActive ? 'text-[#DE3151]' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabDot"
                  className="absolute -top-1 w-1.5 h-1.5 bg-[#DE3151] rounded-full shadow-[0_0_8px_rgba(222,49,81,0.8)]" 
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
