import React, {useEffect, useState} from 'react';
import {KeyRound, RefreshCcw, ShieldCheck, Trash2} from 'lucide-react';
import type {AccessState} from '../lib/access';
import {useLocale} from '../lib/locale';

export interface CommercialActivationResult {
  ok: boolean;
  result?: string;
  error?: string;
  message?: string;
  formalTokenPrepared?: boolean;
}

interface AuthPanelProps {
  accessState: AccessState;
  onSaveLicenseToken: (token: string) => Promise<void>;
  onClearLicenseToken: () => Promise<void>;
  onRefreshAccess: () => Promise<void>;
  onActivateCommercialLicenseKey: (licenseKey: string) => Promise<CommercialActivationResult>;
  compact?: boolean;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  accessState,
  onSaveLicenseToken,
  onClearLicenseToken,
  onRefreshAccess,
  onActivateCommercialLicenseKey,
  compact = false,
}) => {
  const {messages} = useLocale();
  const copy = messages.authPanel;
  const [tokenInput, setTokenInput] = useState(accessState.license.token ?? '');
  const [commercialLicenseKey, setCommercialLicenseKey] = useState('');
  const [commercialResult, setCommercialResult] = useState<CommercialActivationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const accessLabel = accessState.isPremium ? accessState.accessSource : copy.freeMode;
  const trialStatus = accessState.isTrialActive
    ? `${copy.activeUntilPrefix}${accessState.trial.lastKnownEndsAt
      ? ` ${new Date(accessState.trial.lastKnownEndsAt).toLocaleString()}`
      : ''}`
    : accessState.trial.lastKnownEndsAt
      ? copy.trialEnded
      : copy.notStarted;
  const licenseStatus = accessState.license.hasStoredToken
    ? accessState.license.isValid
      ? copy.valid
      : accessState.license.isExpired
        ? copy.expired
        : copy.invalid
    : copy.notInstalled;
  const isEffectiveLicensedState =
    accessState.accessSource === 'LICENSE' &&
    accessState.license.hasStoredToken &&
    accessState.license.isValid;
  const activationResultText = commercialResult
    ? commercialResult.ok
      ? commercialResult.result ?? 'ACTIVATED'
      : commercialResult.error ?? 'ACTIVATION_FAILED'
    : null;

  useEffect(() => {
    setTokenInput(accessState.license.token ?? '');
  }, [accessState.license.token]);

  const saveLicenseTokenValue = async (nextToken: string) => {
    const normalizedToken = nextToken.trim();
    await onSaveLicenseToken(normalizedToken);
    setTokenInput(normalizedToken);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await saveLicenseTokenValue(tokenInput);
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

  const handleCommercialActivate = async () => {
    setIsSubmitting(true);
    setCommercialResult(null);
    try {
      const response = await fetch('/.netlify/functions/license-activate-and-issue', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: commercialLicenseKey,
          deviceId: accessState.deviceId,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.ok === true && typeof data?.formalToken === 'string') {
        setTokenInput(data.formalToken);
        try {
          await saveLicenseTokenValue(data.formalToken);
          setCommercialResult({
            ok: true,
            result: typeof data?.activation?.result === 'string' ? data.activation.result : 'ACTIVATED',
            message: copy.licenseSavedSuccess,
            formalTokenPrepared: true,
          });
        } catch {
          setCommercialResult({
            ok: false,
            error: 'LICENSE_SAVE_FAILED',
            message: copy.tokenPreparedManual,
            formalTokenPrepared: true,
          });
        }
        return;
      }

      setCommercialResult({
        ok: false,
        error:
          typeof data?.code === 'string'
            ? data.code
            : typeof data?.message === 'string'
              ? data.message
              : 'ACTIVATION_FAILED',
      });
    } catch {
      setCommercialResult({
        ok: false,
        error: 'ACTIVATION_REQUEST_FAILED',
      });
    } finally {
      // keep local fallback prop intact for compatibility even though this path now uses auto-issue v1
      void onActivateCommercialLicenseKey;
      setIsSubmitting(false);
    }
  };

  const containerClassName = compact
    ? 'rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl'
    : 'rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl';

  return (
    <section className={containerClassName}>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/60">{copy.currentAccess}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-xl font-semibold text-white">{accessLabel}</p>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                {copy.accessStatus}
              </span>
            </div>
            <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-white/78">
              {accessState.isPremium
                ? copy.premiumAccessHelp
                : copy.freeAccessHelp}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-[1.2fr_1fr_1fr]">
          <div
            className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            title={accessState.deviceId}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">{copy.deviceId}</p>
            <p className="mt-2 break-all font-mono text-[11px] leading-5 text-white/78">
              {accessState.deviceId}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">{copy.trial}</p>
            <p className="mt-2 text-sm font-medium text-white/92">{trialStatus}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">{copy.license}</p>
            <p className="mt-2 text-sm font-medium text-white/92">{licenseStatus}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-200/90">
          {copy.step1Title}
        </p>
        <p className="mt-2 text-sm text-white/76">
          {copy.step1Description}
        </p>
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-white/58">
            {copy.commercialLicenseKey}
          </span>
          <input
            value={commercialLicenseKey}
            onChange={(event) => setCommercialLicenseKey(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white placeholder:text-white/42 outline-none transition focus:border-emerald-400/60"
            placeholder={copy.commercialLicenseKeyPlaceholder}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCommercialActivate}
            disabled={isSubmitting || commercialLicenseKey.trim() === ''}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/45 bg-emerald-400/18 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-[0_10px_24px_rgba(16,185,129,0.12)] transition hover:bg-emerald-400/24 hover:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {copy.activateLicenseKey}
          </button>
        </div>

        {activationResultText && (
          <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <p
              className={`text-xs uppercase tracking-[0.2em] ${
                commercialResult?.ok ? 'text-emerald-300' : 'text-red-300'
              }`}
            >
              {activationResultText}
            </p>
            {commercialResult?.ok && (
              <p className="mt-2 text-xs leading-5 text-white/76">
                {copy.activationConfirmsStatus}
              </p>
            )}
            {commercialResult?.ok && commercialResult.message && (
              <p className="mt-2 text-xs font-medium leading-5 text-emerald-100">
                {commercialResult.message}
              </p>
            )}
            {!commercialResult?.ok && commercialResult?.message && (
              <p className="mt-2 text-xs font-medium leading-5 text-white/80">
                {commercialResult.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-100/90">
          {copy.step2Title}
        </p>
        <p className="mt-2 text-sm text-white/76">
          {copy.step2Description}
        </p>
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-white/58">
            {copy.licenseToken}
          </span>
          <textarea
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            rows={compact ? 4 : 6}
            className="w-full rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 font-mono text-xs text-white placeholder:text-white/42 shadow-inner shadow-black/10 outline-none transition focus:border-emerald-400/60 focus:bg-white/[0.1]"
            placeholder={copy.licenseTokenPlaceholder}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting || tokenInput.trim() === ''}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {copy.saveLicense}
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/82 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          {copy.refresh}
        </button>
        {!isEffectiveLicensedState && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting || !accessState.license.hasStoredToken}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {copy.clearLicense}
          </button>
        )}
      </div>
    </section>
  );
};
