import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Settings, Image as ImageIcon, X, Clock, Music, Bell, Music2, Volume2, VolumeX, Headphones, HeadphoneOff } from 'lucide-react';
import { useTimer } from './hooks/useTimer';
import { cn } from './lib/utils';
import { soundManager, TickType, AlarmType } from './lib/sounds';

const DURATIONS = [90, 60, 45, 30, 15, 5];
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=1920";

export default function App() {
  const [duration, setDuration] = useState(25);
  const [bgImage, setBgImage] = useState(DEFAULT_IMAGE);
  const [showSettings, setShowSettings] = useState(false);
  const [tickType, setTickType] = useState<TickType>('classic');
  const [alarmType, setAlarmType] = useState<AlarmType>('classic');
  const [bgMusicUrl, setBgMusicUrl] = useState<string | null>(null);
  const [bgMusicName, setBgMusicName] = useState<string | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tickInputRef = useRef<HTMLInputElement>(null);
  const alarmInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { timeLeft, isActive, isFinished, toggle, reset, formatTime } = useTimer(duration, { soundEnabled: sfxEnabled });

  React.useEffect(() => {
    if (audioRef.current) {
      if (isActive && bgMusicUrl && musicEnabled) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isActive, bgMusicUrl, musicEnabled]);

  const handleReset = () => {
    reset(duration);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBgImage(url);
    }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBgMusicUrl(url);
      setBgMusicName(file.name);
    }
  };

  const handleTickTypeChange = (type: TickType) => {
    setTickType(type);
    soundManager.setTickType(type);
    soundManager.playTick(); // Preview
  };

  const handleAlarmTypeChange = (type: AlarmType) => {
    setAlarmType(type);
    soundManager.setAlarmType(type);
    soundManager.playAlarm(10); // Preview
  };

  const handleDurationChange = (d: number) => {
    setDuration(d);
    reset(d);
    setShowSettings(false);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans text-white">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex h-full flex-col items-center justify-center p-8">
        {/* Large Visual Timer Display */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex h-1/2 w-full items-center justify-center"
        >
          <div className="relative flex items-baseline gap-4">
            {/* Minutes: Protruding 3D Effect */}
            <h1 
              className={cn(
                "text-[28vw] font-black leading-none tracking-tighter text-white",
                "select-none transition-all duration-300 animate-glow",
                isActive ? "opacity-100" : "opacity-80"
              )}
              style={{
                textShadow: `
                  0 1px 0 #ccc,
                  0 2px 0 #c9c9c9,
                  0 3px 0 #bbb,
                  0 4px 0 #b9b9b9,
                  0 5px 0 #aaa,
                  0 6px 1px rgba(0,0,0,.1),
                  0 0 5px rgba(0,0,0,.1),
                  0 1px 3px rgba(0,0,0,.3),
                  0 3px 5px rgba(0,0,0,.2),
                  0 5px 10px rgba(0,0,0,.25),
                  0 10px 10px rgba(0,0,0,.2),
                  0 20px 20px rgba(0,0,0,.15)
                `
              }}
            >
              {formatTime().minutes}
            </h1>

            {/* Colon */}
            <span className="text-[15vw] font-black text-white/40 mb-[4vw]">:</span>

            {/* Seconds: Recessed 3D Effect */}
            <h1 
              className={cn(
                "text-[24vw] font-black leading-none tracking-tighter animate-glow",
                "select-none transition-all duration-300",
                "text-black/40"
              )}
              style={{
                textShadow: `
                  -1px -1px 1px rgba(0,0,0,0.8),
                  1px 1px 1px rgba(255,255,255,0.2),
                  0px 0px 20px rgba(0,0,0,0.3)
                `
              }}
            >
              {formatTime().seconds}
            </h1>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={handleReset}
              className="group flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
              title="Reset"
            >
              <RotateCcw className="h-8 w-8 text-white/80 group-hover:text-white" />
            </button>

            <button
              onClick={toggle}
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-90 shadow-2xl",
                isActive 
                  ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
                  : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
              )}
            >
              {isActive ? (
                <Pause className="h-12 w-12 fill-white text-white" />
              ) : (
                <Play className="ml-2 h-12 w-12 fill-white text-white" />
              )}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="group flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
              title="Settings"
            >
              <Settings className="h-8 w-8 text-white/80 group-hover:text-white" />
            </button>
          </div>

          {/* Subtle Secondary Toggles */}
          <div className="flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity duration-500">
            <button
              onClick={() => setSfxEnabled(!sfxEnabled)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all border backdrop-blur-sm",
                sfxEnabled ? "border-white/40 bg-white/5 text-white/90" : "border-red-500/50 bg-red-500/10 text-red-400"
              )}
            >
              {sfxEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              Clock Sound
            </button>

            <button
              onClick={() => setMusicEnabled(!musicEnabled)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all border backdrop-blur-sm",
                musicEnabled ? "border-white/40 bg-white/5 text-white/90" : "border-blue-500/50 bg-blue-500/10 text-blue-400"
              )}
            >
              {musicEnabled ? <Headphones className="h-3.5 w-3.5" /> : <HeadphoneOff className="h-3.5 w-3.5" />}
              Music
            </button>
          </div>

          {isFinished && (
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl font-medium text-emerald-400"
            >
              Time's up! Great job.
            </motion.p>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
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
                  onClick={() => setShowSettings(false)}
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
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => handleDurationChange(d)}
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
                      onChange={handleImageUpload} 
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
                            onClick={() => handleTickTypeChange(t)}
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
                            onClick={() => handleAlarmTypeChange(a)}
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
                        <span className="text-sm text-zinc-300">
                          {bgMusicName || "Upload Music File"}
                        </span>
                        <Music2 className="h-4 w-4 text-blue-400" />
                      </button>
                      <input 
                        type="file" 
                        ref={musicInputRef} 
                        onChange={handleMusicUpload} 
                        className="hidden" 
                        accept="audio/*"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-8 flex-shrink-0 rounded-2xl bg-white py-4 text-lg font-bold text-black hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p className="text-white/30 text-[10px] tracking-[0.4em] uppercase font-medium">Visual Pomodoro</p>
        <p className="text-white/30 text-[8px] tracking-[0.2em] uppercase mt-1">Focus Flow</p>
      </div>

      {/* Hidden Audio Element for Music */}
      {bgMusicUrl && (
        <audio ref={audioRef} src={bgMusicUrl} loop />
      )}
    </div>
  );
}
