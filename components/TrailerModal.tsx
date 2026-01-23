
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const TrailerModal: React.FC<TrailerModalProps> = ({ isOpen, onClose, title }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl aspect-video glass rounded-3xl overflow-hidden shadow-2xl border-indigo-500/20"
          >
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* Using a placeholder for trailer content */}
            <div className="w-full h-full bg-slate-900 flex items-center justify-center flex-col gap-4">
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black">{title}</h3>
                <p className="text-slate-500 font-medium">Official Trailer (Placeholder)</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TrailerModal;
