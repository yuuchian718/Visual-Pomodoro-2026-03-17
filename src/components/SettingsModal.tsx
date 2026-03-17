import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, ImageIcon, Music, Bell, Music2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { TickType, AlarmType } from '../lib/sounds';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  duration: number;
  durations: number[];
  onDurationChange: (d: number) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  tickType: TickType;
  onTickTypeChange: (t: TickType) => void;
  alarmType: AlarmType;
  onAlarmTypeChange: (a: AlarmType) => void;
  bgMusicName: string | null;
  onMusicUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  musicInputRef: React.RefObject<HTMLInputElement | null>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  duration,
  durations,
  onDurationChange,
  onImageUpload,
  fileInputRef,
  tickType,
  onTickTypeChange,
  alarmType,
  onAlarmTypeChange,
  bgMusicName,
  onMusicUpload,
  musicInputRef,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-zinc-900/90 p-8 border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="mb-8 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-emerald-400" />
                Customization
              </h2>
              <button 
                onClick={onClose}
                className="rounded-full p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar flex-grow py-2">
              {/* Duration Selection */}
              <section>
                <label className="mb-4 block text-sm font-medium text-zinc-400 uppercase tracking-widest">
                  Timer Duration (Minutes)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {durations.map(d => (
                    <button
                      key={d}
                      onClick={() => onDurationChange(d)}
                      className={cn(
                        "rounded-xl py-3 text-lg font-semibold transition-all",
                        duration === d 
                          ? "bg-emerald-500 text-white" 
                          : "bg-white/5 hover:bg-white/10 text-zinc-300"
                      )}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </section>

              {/* Background Selection */}
              <section>
                <label className="mb-4 block text-sm font-medium text-zinc-400 uppercase tracking-widest">
                  Background Image
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-4 hover:bg-white/10 transition-all border border-dashed border-white/20"
                  >
                    <ImageIcon className="h-5 w-5" />
                    Upload Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={onImageUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
              </section>

              {/* Sound Selection */}
              <section className="space-y-6">
                <label className="block text-sm font-medium text-zinc-400 uppercase tracking-widest">
                  Sound Modes
                </label>
                
                <div className="space-y-6">
                  {/* Tick Sound Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider">
                      <Music className="h-3 w-3" />
                      Tick Style
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['classic', 'wood', 'digital'] as TickType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => onTickTypeChange(t)}
                          className={cn(
                            "rounded-lg py-2 text-xs font-medium transition-all border capitalize",
                            tickType === t 
                              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alarm Sound Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider">
                      <Bell className="h-3 w-3" />
                      Alarm Style
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['classic', 'pulse', 'chime'] as AlarmType[]).map(a => (
                        <button
                          key={a}
                          onClick={() => onAlarmTypeChange(a)}
                          className={cn(
                            "rounded-lg py-2 text-xs font-medium transition-all border capitalize",
                            alarmType === a 
                              ? "bg-red-500/20 border-red-500/50 text-red-400" 
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Music Upload */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider">
                      <Music2 className="h-3 w-3" />
                      Background Music
                    </div>
                    <button
                      onClick={() => musicInputRef.current?.click()}
                      className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10 transition-all border border-white/5"
                    >
                      <span className="text-sm text-zinc-300 truncate max-w-[200px]">
                        {bgMusicName || "Upload Music File"}
                      </span>
                      <Music2 className="h-4 w-4 text-blue-400" />
                    </button>
                    <input 
                      type="file" 
                      ref={musicInputRef} 
                      onChange={onMusicUpload} 
                      className="hidden" 
                      accept="audio/*"
                    />
                  </div>
                </div>
              </section>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-8 flex-shrink-0 rounded-2xl bg-white py-4 text-lg font-bold text-black hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
