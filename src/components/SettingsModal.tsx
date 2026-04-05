import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, ImageIcon, Music, Bell, Music2, ShieldCheck, Timer, Lock, ArrowUpRight, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { TickType, AlarmType } from '../lib/sounds';
import type {AccessState} from '../lib/access';
import {AuthPanel, type CommercialActivationResult} from './AuthPanel';
import {getUpgradeUrl} from '../lib/upgrade';
import {shareApp} from '../lib/share';
import {
  isDurationAllowed,
  isFeatureEnabled,
  shouldShowUpgradeEntry as shouldShowUpgradeEntryByAccess,
} from '../../../koto-licensing-modules/modules/partial-unlock-foundation/core';

export const parseCustomDurationInput = (value: string) => {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const minutes = Number.parseInt(normalizedValue, 10);
  return minutes >= 1 && minutes <= 240 ? minutes : null;
};

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
  accessState: AccessState;
  onSaveLicenseToken: (token: string) => Promise<void>;
  onClearLicenseToken: () => Promise<void>;
  onRefreshAccess: () => Promise<void>;
  onActivateCommercialLicenseKey: (licenseKey: string) => Promise<CommercialActivationResult>;
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
  accessState,
  onSaveLicenseToken,
  onClearLicenseToken,
  onRefreshAccess,
  onActivateCommercialLicenseKey,
}) => {
  const [isCustomDurationOpen, setIsCustomDurationOpen] = React.useState(false);
  const [customDurationInput, setCustomDurationInput] = React.useState('');
  const [customDurationError, setCustomDurationError] = React.useState<string | null>(null);
  const [shareLabel, setShareLabel] = React.useState('Share App');
  const isPremium = accessState.isPremium;
  const canUseCustomDuration = isFeatureEnabled('customDuration', accessState);
  const canUseMusic = isFeatureEnabled('music', accessState);
  const canUseBackgroundFeatures = isFeatureEnabled('backgroundFeatures', accessState);
  const shouldShowUpgradeEntry = shouldShowUpgradeEntryByAccess(accessState);
  const upgradeUrl = getUpgradeUrl();
  const parsedCustomDuration = parseCustomDurationInput(customDurationInput);
  const hasValidCustomDuration = parsedCustomDuration !== null;

  React.useEffect(() => {
    if (shareLabel === 'Share App') {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShareLabel('Share App');
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [shareLabel]);

  const handleCustomDurationApply = () => {
    const parsedMinutes = parsedCustomDuration;
    if (!parsedMinutes) {
      setCustomDurationError('Enter a whole number from 1 to 240.');
      return;
    }

    setCustomDurationError(null);
    setIsCustomDurationOpen(false);
    setCustomDurationInput(String(parsedMinutes));
    onDurationChange(parsedMinutes);
  };

  const handleShare = async () => {
    const result = await shareApp();

    if (result === 'copied') {
      setShareLabel('Link Copied');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xl p-3 sm:p-4 md:p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-[56rem] max-h-[90vh] flex flex-col rounded-3xl border border-white/12 bg-zinc-950/72 px-5 py-6 sm:p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl overflow-hidden"
          >
            <div className="mb-8 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
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
                <label className="mb-4 block text-sm font-medium text-zinc-300 uppercase tracking-widest">
                  Timer Duration (Minutes)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {durations.map(d => (
                    (() => {
                      const isUnlocked = isDurationAllowed(d, accessState);
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            if (!isUnlocked) {
                              return;
                            }
                            onDurationChange(d);
                          }}
                          className={cn(
                            "rounded-xl py-3 text-lg font-semibold transition-all border",
                            duration === d
                              ? "bg-emerald-500 border-emerald-400/80 text-white"
                              : isUnlocked
                                ? "bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300"
                                : "bg-white/[0.035] border-white/8 text-zinc-500 opacity-70"
                          )}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {d}m
                            {!isUnlocked && <Lock className="h-3.5 w-3.5 text-zinc-500" />}
                          </span>
                        </button>
                      );
                    })()
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canUseCustomDuration) {
                        return;
                      }
                      setIsCustomDurationOpen((open) => !open);
                      setCustomDurationError(null);
                    }}
                    className={cn(
                      "rounded-xl py-3 text-lg font-semibold transition-all border",
                      canUseCustomDuration
                        ? isCustomDurationOpen
                          ? "bg-emerald-500 border-emerald-400/80 text-white"
                          : "bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300"
                        : "bg-white/[0.035] border-white/8 text-zinc-500 opacity-70"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Custom
                      {!canUseCustomDuration && <Lock className="h-3.5 w-3.5 text-zinc-500" />}
                    </span>
                  </button>
                </div>
                {!canUseCustomDuration && (
                  <p className="mt-3 text-xs uppercase tracking-[0.24em] text-white/38">
                    Premium unlocks longer sessions and custom duration.
                  </p>
                )}
                {isCustomDurationOpen && (
                  <div className="mt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03]">
                        <Timer className="h-4 w-4 text-emerald-300/80" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customDurationInput}
                        onChange={(event) => {
                          setCustomDurationInput(event.target.value);
                          if (customDurationError) {
                            setCustomDurationError(null);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleCustomDurationApply();
                          }
                        }}
                        placeholder="Enter 1–240 minutes"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/42 outline-none transition focus:border-emerald-400/60"
                      />
                      <button
                        type="button"
                        onClick={handleCustomDurationApply}
                        className={cn(
                          "rounded-xl px-4 py-3 text-sm font-semibold transition",
                          hasValidCustomDuration
                            ? "border border-emerald-400/70 bg-emerald-500 text-white shadow-[0_0_0_1px_rgba(74,222,128,0.15)] hover:bg-emerald-400"
                            : "border border-white/12 bg-white/[0.08] text-white/90 hover:bg-white/[0.12]"
                        )}
                      >
                        Apply
                      </button>
                    </div>
                    {customDurationError && (
                      <p className="mt-3 text-xs text-red-300/90">{customDurationError}</p>
                    )}
                    {!customDurationError && (
                      <p className="mt-3 text-xs text-white/40">Press Enter or Apply</p>
                    )}
                  </div>
                )}
              </section>

              {/* Background Selection */}
              <section>
                <label className="mb-4 block text-sm font-medium text-zinc-300 uppercase tracking-widest">
                  Background Image
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      if (!canUseBackgroundFeatures) {
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-between gap-3 rounded-xl py-4 px-4 transition-all active:scale-[0.99] border border-dashed",
                      canUseBackgroundFeatures
                        ? "bg-white/5 border-white/20 hover:bg-white/10"
                        : "bg-white/[0.035] border-white/10 text-zinc-500 opacity-70 hover:bg-white/[0.05]"
                    )}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <ImageIcon className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-medium text-left">
                        Upload Image
                      </span>
                    </span>
                    {!canUseBackgroundFeatures && (
                      <span className="inline-flex items-center gap-2 shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                        <Lock className="h-3.5 w-3.5" />
                        Premium
                      </span>
                    )}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={onImageUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
                {!canUseBackgroundFeatures && (
                  <p className="mt-3 text-xs text-white/38">
                    Premium unlocks custom backgrounds
                  </p>
                )}
              </section>

              {/* Sound Selection */}
              <section className="space-y-6">
                <label className="block text-sm font-medium text-zinc-300 uppercase tracking-widest">
                  Sound Modes
                </label>
                
                <div className="space-y-6">
                  {/* Tick Sound Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider">
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
                    <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider">
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
                    <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider">
                      <Music2 className="h-3 w-3" />
                      Background Music
                    </div>
                    <button
                      onClick={() => {
                        if (!canUseMusic) {
                          return;
                        }
                        musicInputRef.current?.click();
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all active:scale-[0.99] border",
                        canUseMusic
                          ? "bg-white/5 border-white/5 hover:bg-white/10"
                          : "bg-white/[0.035] border-white/8 text-zinc-500 opacity-70 hover:bg-white/[0.05]"
                      )}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Music2 className={cn("h-4 w-4 shrink-0", canUseMusic ? "text-blue-400" : "text-zinc-500")} />
                        <span className={cn("text-sm truncate", canUseMusic ? "text-zinc-200" : "text-zinc-500")}>
                          {bgMusicName || "Upload Music File"}
                        </span>
                      </span>
                      {canUseMusic || (
                        <span className="inline-flex items-center gap-2 shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                          <Lock className="h-3.5 w-3.5" />
                          Premium
                        </span>
                      )}
                    </button>
                    <input 
                      type="file" 
                      ref={musicInputRef} 
                      onChange={onMusicUpload} 
                      className="hidden" 
                      accept="audio/*"
                    />
                    {!canUseMusic && (
                      <p className="text-xs text-white/38">
                        Premium unlocks background music upload
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {shouldShowUpgradeEntry && (
                <section className="space-y-4 rounded-3xl border border-amber-200/12 bg-[linear-gradient(135deg,rgba(255,248,220,0.08),rgba(255,255,255,0.03))] p-4 text-center">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-widest text-amber-100/80">
                      <ShieldCheck className="h-4 w-4 text-amber-200/80" />
                      Upgrade
                    </div>
                    <p className="mx-auto max-w-xl text-sm leading-6 text-white/72">
                      Unlock longer sessions, custom duration, music, and custom backgrounds.
                    </p>
                  </div>
                  <a
                    href={upgradeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white/92 transition-all hover:bg-white/[0.12] hover:text-white active:scale-[0.99]"
                  >
                    Unlock Full Version
                    <ArrowUpRight className="h-4 w-4 text-amber-200/85" />
                  </a>
                </section>
              )}

              <section className="space-y-4 rounded-3xl border border-white/8 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-zinc-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Access & License
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleShare();
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/86 transition-all hover:bg-white/[0.12] hover:text-white active:scale-[0.99]"
                  >
                    <Share2 className="h-3.5 w-3.5 text-white/78" />
                    {shareLabel}
                  </button>
                </div>
                <AuthPanel
                  accessState={accessState}
                  onSaveLicenseToken={onSaveLicenseToken}
                  onClearLicenseToken={onClearLicenseToken}
                  onRefreshAccess={onRefreshAccess}
                  onActivateCommercialLicenseKey={onActivateCommercialLicenseKey}
                  compact
                />
              </section>
            </div>

            <button
              onClick={onClose}
              className="mt-8 w-full flex-shrink-0 rounded-2xl border border-white/16 bg-white/[0.11] py-3.5 text-base font-semibold text-white/95 shadow-lg shadow-black/20 transition-all hover:bg-white/[0.15] hover:text-white active:scale-[0.98]"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
