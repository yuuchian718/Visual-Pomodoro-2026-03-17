import {getDeviceId} from './device-id';
import {
  TrialInitializationResult,
  ensureTrialInitialized,
  getTrialState,
  resolveAccessState,
} from './trial';
import {getStoredLicenseStatus, LicenseValidationResult} from './license';
import {
  applyForcedFreeMode,
  resolveEntitlementsFromAccess,
  type EntitlementState,
} from './partial-unlock-core';

export interface AccessState extends EntitlementState {
  deviceId: string;
  license: LicenseValidationResult;
  trial: TrialInitializationResult & {
    lastKnownFirstSeenAt: number | null;
    lastKnownEndsAt: number | null;
  };
}

const FORCE_FREE_MODE_QUERY_KEY = 'forceFreeMode';
const FORCE_FREE_MODE_STORAGE_KEY = 'koto_force_free_mode';

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

export async function resolveStartupAccess(): Promise<AccessState> {
  const deviceId = getDeviceId();
  const license = await getStoredLicenseStatus(deviceId);

  if (license.hasStoredToken) {
    // Stored formal tokens are evaluated first. If browser-side validation fails,
    // the app deliberately falls back to LOCKED and lets partial-unlock rules decide
    // which free features remain visible.
    const resolved = resolveAccessState({
      hasStoredToken: true,
      isLicenseValid: license.isValid,
      isTrialAvailable: false,
    });

    const trialState = getTrialState();

    const accessState: AccessState = {
      ...resolveEntitlementsFromAccess(resolved),
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

    return shouldForceFreeModeInDev()
      ? {
          ...accessState,
          ...applyForcedFreeMode(accessState),
        }
      : accessState;
  }

  const trial = await ensureTrialInitialized(deviceId);
  const resolved = resolveAccessState({
    hasStoredToken: false,
    isLicenseValid: false,
    isTrialAvailable: trial.isTrialValid,
  });

  const accessState: AccessState = {
    ...resolveEntitlementsFromAccess(resolved),
    deviceId,
    license,
    trial: {
      ...trial,
      lastKnownFirstSeenAt: trial.firstSeenAt,
      lastKnownEndsAt: trial.trialEndsAt,
    },
  };

  return shouldForceFreeModeInDev()
    ? {
        ...accessState,
        ...applyForcedFreeMode(accessState),
      }
    : accessState;
}
