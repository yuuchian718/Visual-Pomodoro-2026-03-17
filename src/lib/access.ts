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
  deviceId: string;
  license: LicenseValidationResult;
  trial: TrialInitializationResult & {
    lastKnownFirstSeenAt: number | null;
    lastKnownEndsAt: number | null;
  };
}

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

    return {
      ...resolved,
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
  }

  const trial = await ensureTrialInitialized(deviceId);
  const resolved = resolveAccessState({
    hasStoredToken: false,
    isLicenseValid: false,
    isTrialAvailable: trial.isTrialValid,
  });

  return {
    ...resolved,
    deviceId,
    license,
    trial: {
      ...trial,
      lastKnownFirstSeenAt: trial.firstSeenAt,
      lastKnownEndsAt: trial.trialEndsAt,
    },
  };
}
