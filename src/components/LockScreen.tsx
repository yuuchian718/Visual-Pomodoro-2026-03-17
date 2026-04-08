import React from 'react';
import type {AccessState} from '../lib/access';
import {useLocale} from '../lib/locale';
import {AuthPanel, type CommercialActivationResult} from './AuthPanel';

interface LockScreenProps {
  accessState: AccessState;
  onSaveLicenseToken: (token: string) => Promise<void>;
  onClearLicenseToken: () => Promise<void>;
  onRefreshAccess: () => Promise<void>;
  onActivateCommercialLicenseKey: (licenseKey: string) => Promise<CommercialActivationResult>;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  accessState,
  onSaveLicenseToken,
  onClearLicenseToken,
  onRefreshAccess,
  onActivateCommercialLicenseKey,
}) => {
  const {messages} = useLocale();
  const copy = messages.lockScreen;
  const helperText = accessState.license.hasStoredToken
    ? copy.storedLicenseInvalid
    : accessState.trial.requiresOnlineInitialization
      ? copy.trialBootstrapNeeded
      : copy.noValidAccess;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_42%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_28%)]" />
      <main className="relative z-10 w-full max-w-3xl rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.4em] text-white/35">Visual Pomodoro</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{copy.lockedTitle}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">{helperText}</p>
        <div className="mt-8">
          <AuthPanel
            accessState={accessState}
            onSaveLicenseToken={onSaveLicenseToken}
            onClearLicenseToken={onClearLicenseToken}
            onRefreshAccess={onRefreshAccess}
            onActivateCommercialLicenseKey={onActivateCommercialLicenseKey}
          />
        </div>
      </main>
    </div>
  );
};
