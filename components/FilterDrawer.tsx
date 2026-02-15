
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Mic, MicOff, Send, MessageSquareText } from 'lucide-react';
import { DiscoveryFilters } from '../types';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: DiscoveryFilters;
  onApply?: (filters: DiscoveryFilters) => void;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose, currentFilters, onApply }) => {
  const [prompt, setPrompt] = useState(currentFilters?.naturalLanguagePrompt || '');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const preVoicePrompt = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const sessionTranscript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        
        const base = preVoicePrompt.current.trim();
        const separator = base ? ' ' : '';
        setPrompt(`${base}${separator}${sessionTranscript}`);
      };

      recognition.onend = () => {
        setIsListening(false);
        textareaRef.current?.focus();
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      preVoicePrompt.current = prompt;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply({ naturalLanguagePrompt: prompt, wildcard: false });
    }
  };

  const handleSurprise = () => {
    if (onApply) {
      onApply({ naturalLanguagePrompt: '', wildcard: true });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={onClose}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[110] bg-zinc-950 border-t border-white/5 rounded-t-[3rem] p-8 max-w-md mx-auto shadow-[0_-20px_60px_rgba(222,49,81,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="w-16 h-1 bg-zinc-800 rounded-full mx-auto mb-8 shrink-0" />
            
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex items-center gap-3">
                <MessageSquareText className="w-6 h-6 text-[#DE3151]" />
                <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">Cinema Muse</h3>
              </div>
              <button onPointerDown={onClose} className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-8 flex flex-col">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 leading-relaxed">
                Describe a vibe, a specific plot point, or "films like...". Your cinematic companion is listening.
              </p>

              <div className="relative group mb-8">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A fast-paced 90s thriller set in London like Snatch..."
                  className="w-full h-44 bg-zinc-900/50 border-2 border-zinc-800 rounded-[2rem] p-6 text-white font-medium text-sm outline-none focus:border-[#DE3151] transition-all resize-none placeholder:text-zinc-800 pr-16 leading-relaxed"
                />
                <button
                  onClick={toggleListening}
                  className={`absolute right-4 bottom-4 w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
                    isListening 
                      ? 'bg-[#DE3151] text-white ring-4 ring-[#DE3151]/20 animate-pulse' 
                      : 'bg-zinc-800 text-zinc-500 hover:text-white'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              <div className="space-y-3 shrink-0">
                <button 
                  onClick={handleApply}
                  disabled={!prompt.trim() && !isListening}
                  className="w-full py-5 bg-zinc-100 text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                >
                  <Send className="w-4 h-4" />
                  Guide Discovery
                </button>
                <div className="flex items-center gap-4 py-4">
                  <div className="h-px flex-1 bg-zinc-900" />
                  <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">or</span>
                  <div className="h-px flex-1 bg-zinc-900" />
                </div>
                <button 
                  onClick={handleSurprise}
                  className="w-full py-6 bg-gradient-to-br from-zinc-900 to-zinc-950 text-white border border-zinc-800 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:border-[#DE3151]/30 shadow-2xl transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-5 h-5 text-[#DE3151]" />
                  Surprise Me
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterDrawer;
