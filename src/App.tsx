import React, { useState, useRef } from 'react';
import { useTimer } from './hooks/useTimer';
import { soundManager, TickType, AlarmType } from './lib/sounds';
import { TimerDisplay } from './components/TimerDisplay';
import { TimerControls } from './components/TimerControls';
import { SettingsModal } from './components/SettingsModal';

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
  const musicInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { timeLeft, isActive, isFinished, toggle, reset, formatTime } = useTimer(duration, { soundEnabled: sfxEnabled });

  React.useEffect(() => {
    if (audioRef.current) {
      if (isActive && bgMusicUrl && musicEnabled) {
        audioRef.current.play().catch(() => {}); // Silent catch for production
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
    soundManager.playTick();
  };

  const handleAlarmTypeChange = (type: AlarmType) => {
    setAlarmType(type);
    soundManager.setAlarmType(type);
    soundManager.playAlarm(10);
  };

  const handleDurationChange = (d: number) => {
    setDuration(d);
    reset(d);
    setShowSettings(false);
  };

  const { minutes, seconds } = formatTime();

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
        <TimerDisplay 
          minutes={minutes} 
          seconds={seconds} 
          isActive={isActive} 
        />

        <TimerControls 
          isActive={isActive}
          isFinished={isFinished}
          sfxEnabled={sfxEnabled}
          musicEnabled={musicEnabled}
          onToggle={toggle}
          onReset={handleReset}
          onOpenSettings={() => setShowSettings(true)}
          onToggleSfx={() => setSfxEnabled(!sfxEnabled)}
          onToggleMusic={() => setMusicEnabled(!musicEnabled)}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        duration={duration}
        durations={DURATIONS}
        onDurationChange={handleDurationChange}
        onImageUpload={handleImageUpload}
        fileInputRef={fileInputRef}
        tickType={tickType}
        onTickTypeChange={handleTickTypeChange}
        alarmType={alarmType}
        onAlarmTypeChange={handleAlarmTypeChange}
        bgMusicName={bgMusicName}
        onMusicUpload={handleMusicUpload}
        musicInputRef={musicInputRef}
      />

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
