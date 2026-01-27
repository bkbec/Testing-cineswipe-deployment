
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { MovieService } from '../services/movieService';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  movieId?: string;
}

const TrailerModal: React.FC<TrailerModalProps> = ({ isOpen, onClose, title, movieId }) => {
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && movieId) {
      setIsLoading(true);
      MovieService.getTrailerKey(movieId).then(key => {
        setVideoKey(key);
        setIsLoading(false);
      });
    } else {
      setVideoKey(null);
    }
  }, [isOpen, movieId]);

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
            
            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
              {isLoading ? (
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DE3151]"></div>
              ) : videoKey ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&modestbranding=1`}
                  title={title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-black text-white">Trailer Unavailable</h3>
                  <p className="text-zinc-500 font-medium">We couldn't find a video for {title}.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TrailerModal;
