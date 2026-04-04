import {getDeviceId} from './device-id';
import {
  TrialInitializationResult,
  ensureTrialInitialized,
  getTrialState,
  resolveAccessState,
} from './trial';
import {getStoredLicenseStatus, LicenseValidationResult} from './license';

export interface AccessState {
  accessSource: 'LICENSE' | 'TRIAL' | 'LOCKED';
  isPremium: boolean;
  isLocked: boolean;
  isTrialActive: boolean;
  allowedBaseDurations: number[];
  canUseCustomDuration: boolean;
  canUseMusic: boolean;
  canUseBackgroundFeatures: boolean;
  deviceId: string;
  license: LicenseValidationResult;
  trial: TrialInitializationResult & {
    lastKnownFirstSeenAt: number | null;
    lastKnownEndsAt: number | null;
  };
}

const FREE_BASE_DURATIONS = [5, 15, 25];
const FORCE_FREE_MODE_QUERY_KEY = 'forceFreeMode';
const FORCE_FREE_MODE_STORAGE_KEY = 'koto_force_free_mode';

const withEntitlements = <
  T extends {
    isPremium: boolean;
    accessSource: 'LICENSE' | 'TRIAL' | 'LOCKED';
    isLocked: boolean;
    isTrialActive: boolean;
  },
>(
  resolved: T,
) => ({
  ...resolved,
  allowedBaseDurations: FREE_BASE_DURATIONS,
  canUseCustomDuration: resolved.isPremium,
  canUseMusic: resolved.isPremium,
  canUseBackgroundFeatures: resolved.isPremium,
});

const shouldForceFreeModeInDev = () => {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get(FORCE_FREE_MODE_QUERY_KEY) === '1') {
    return true;
  }

  try {
    return window.localStorage.getItem(FORCE_FREE_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const toForcedFreeAccessState = (accessState: AccessState): AccessState => ({
  ...accessState,
  accessSource: 'LOCKED',
  isPremium: false,
  isLocked: false,
  isTrialActive: false,
  allowedBaseDurations: FREE_BASE_DURATIONS,
  canUseCustomDuration: false,
  canUseMusic: false,
  canUseBackgroundFeatures: false,
});

export async function resolveStartupAccess(): Promise<AccessState> {
  const deviceId = getDeviceId();
  const license = await getStoredLicenseStatus(deviceId);

  if (license.hasStoredToken) {
    const resolved = resolveAccessState({
      hasStoredToken: true,
      isLicenseValid: license.isValid,
      isTrialAvailable: false,
    });

    const trialState = getTrialState();

    const accessState = {
      ...withEntitlements(resolved),
      deviceId,
      license,
      trial: {
        firstSeenAt: trialState.firstSeenAt,
        trialEndsAt: trialState.trialEndsAt,
        initialized: trialState.firstSeenAt !== null && trialState.trialEndsAt !== null,
        requiresOnlineInitialization: false,
        isTrialValid: trialState.isActive,
        lastKnownFirstSeenAt: trialState.firstSeenAt,
        lastKnownEndsAt: trialState.trialEndsAt,
      },
    };

    return shouldForceFreeModeInDev() ? toForcedFreeAccessState(accessState) : accessState;
  }

  const trial = await ensureTrialInitialized(deviceId);
  const resolved = resolveAccessState({
    hasStoredToken: false,
    isLicenseValid: false,
    isTrialAvailable: trial.isTrialValid,
  });

  const accessState = {
    ...withEntitlements(resolved),
    deviceId,
    license,
    trial: {
      ...trial,
      lastKnownFirstSeenAt: trial.firstSeenAt,
      lastKnownEndsAt: trial.trialEndsAt,
    },
  };

  return shouldForceFreeModeInDev() ? toForcedFreeAccessState(accessState) : accessState;
}
