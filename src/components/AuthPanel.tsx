import React, {useEffect, useState} from 'react';
import {KeyRound, RefreshCcw, ShieldCheck, Trash2} from 'lucide-react';
import type {AccessState} from '../lib/access';

interface AuthPanelProps {
  accessState: AccessState;
  onSaveLicenseToken: (token: string) => Promise<void>;
  onClearLicenseToken: () => Promise<void>;
  onRefreshAccess: () => Promise<void>;
  compact?: boolean;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  accessState,
  onSaveLicenseToken,
  onClearLicenseToken,
  onRefreshAccess,
  compact = false,
}) => {
  const [tokenInput, setTokenInput] = useState(accessState.license.token ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTokenInput(accessState.license.token ?? '');
  }, [accessState.license.token]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSaveLicenseToken(tokenInput);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    setIsSubmitting(true);
    try {
      await onClearLicenseToken();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsSubmitting(true);
    try {
      await onRefreshAccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerClassName = compact
    ? 'rounded-2xl border border-white/10 bg-white/5 p-4'
    : 'rounded-3xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl';

  return (
    <section className={containerClassName}>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">Access</p>
          <p className="text-lg font-semibold text-white">{accessState.accessSource}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm text-white/70">
        <p>Device ID: <span className="font-mono text-white">{accessState.deviceId}</span></p>
        <p>
          Trial: {accessState.isTrialActive ? 'Active' : 'Unavailable'}
          {accessState.trial.lastKnownEndsAt
            ? ` until ${new Date(accessState.trial.lastKnownEndsAt).toLocaleString()}`
            : ''}
        </p>
        <p>
          License: {accessState.license.hasStoredToken
            ? accessState.license.isValid
              ? 'Valid'
              : accessState.license.isExpired
                ? 'Expired'
                : 'Invalid'
            : 'Not installed'}
        </p>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-white/40">
          License Token
        </span>
        <textarea
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          rows={compact ? 4 : 6}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-emerald-400/60"
          placeholder="Paste your Visual Pomodoro license token"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting || tokenInput.trim() === ''}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          Save License
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={isSubmitting || !accessState.license.hasStoredToken}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          Clear License
        </button>
      </div>
    </section>
  );
};
