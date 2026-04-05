import trialConfig from '../../config/trial.json';

const TRIAL_PUBLIC_KEY_B64 = import.meta.env.VITE_KOTO_TRIAL_PUBLIC_KEY_B64 || '';
export const TRIAL_FIRST_SEEN_KEY = 'koto_trial_first_seen_at';
export const TRIAL_ENDS_AT_KEY = 'koto_trial_ends_at';
export const TRIAL_LAST_TRUSTED_SERVER_TIME_KEY = 'koto_trial_last_trusted_server_time';
export const TRIAL_TOKEN_KEY = 'koto_trial_token';
export const LICENSE_TOKEN_KEY = 'koto_license_token';
export const TRIAL_DAYS = trialConfig.trialDays;

// Trial state and formal-license state intentionally use separate keys:
// trial values remain cached locally, while the formal token lives under
// LICENSE_TOKEN_KEY and is validated by src/lib/license.ts.

const TRIAL_BOOTSTRAP_ENDPOINT = '/.netlify/functions/trial';

export interface TrialInitializationResult {
  firstSeenAt: number | null;
  trialEndsAt: number | null;
  initialized: boolean;
  requiresOnlineInitialization: boolean;
  isTrialValid: boolean;
}

export interface TrialState {
  firstSeenAt: number | null;
  trialEndsAt: number | null;
  lastTrustedServerTime: number | null;
  isActive: boolean;
  isExpired: boolean;
}

interface TrialBootstrapResult {
  status: 'TRIAL' | 'LOCKED';
  serverNow: number;
  firstSeenAt: number;
  trialEndsAt: number;
  trialToken: string | null;
}

interface ParsedTrialToken {
  firstSeenAt: number;
  endsAt: number;
  signatureB64: string;
}

const parseStoredTimestamp = (value: string | null): number | null => {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const persistTrialState = ({
  firstSeenAt,
  trialEndsAt,
  lastTrustedServerTime,
  trialToken,
}: {
  firstSeenAt: number;
  trialEndsAt: number;
  lastTrustedServerTime: number;
  trialToken: string | null;
}) => {
  localStorage.setItem(TRIAL_FIRST_SEEN_KEY, String(firstSeenAt));
  localStorage.setItem(TRIAL_ENDS_AT_KEY, String(trialEndsAt));
  localStorage.setItem(
    TRIAL_LAST_TRUSTED_SERVER_TIME_KEY,
    String(lastTrustedServerTime),
  );

  if (trialToken === null) {
    localStorage.removeItem(TRIAL_TOKEN_KEY);
    return;
  }

  localStorage.setItem(TRIAL_TOKEN_KEY, trialToken);
};

const decodeBase64 = (input: string): Uint8Array => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const importPublicKey = async (): Promise<CryptoKey | null> => {
  if (!TRIAL_PUBLIC_KEY_B64) return null;

  const publicKeyBytes = decodeBase64(TRIAL_PUBLIC_KEY_B64);

  try {
    if (publicKeyBytes.length === 32) {
      return await crypto.subtle.importKey(
        'raw',
        publicKeyBytes,
        {name: 'Ed25519'},
        false,
        ['verify'],
      );
    }

    return await crypto.subtle.importKey(
      'spki',
      publicKeyBytes,
      {name: 'Ed25519'},
      false,
      ['verify'],
    );
  } catch {
    return null;
  }
};

const buildTrialMessage = ({
  deviceId,
  firstSeenAt,
  endsAt,
}: {
  deviceId: string;
  firstSeenAt: number;
  endsAt: number;
}) => `KOTO1|TRIAL|${deviceId}|${firstSeenAt}|${endsAt}`;

const parseTrialToken = (token: string): ParsedTrialToken | null => {
  const parts = token.trim().split('.');

  if (parts.length !== 5 || parts[0] !== 'KOTO1' || parts[1] !== 'TRIAL') {
    return null;
  }

  const firstSeenAt = Number(parts[2]);
  const endsAt = Number(parts[3]);
  const signatureB64 = parts[4];

  if (
    !Number.isFinite(firstSeenAt) ||
    firstSeenAt <= 0 ||
    !Number.isFinite(endsAt) ||
    endsAt <= 0 ||
    !signatureB64
  ) {
    return null;
  }

  return {
    firstSeenAt,
    endsAt,
    signatureB64,
  };
};

export const verifyTrialToken = async ({
  deviceId,
  firstSeenAt,
  endsAt,
  trialToken,
}: {
  deviceId: string;
  firstSeenAt: number;
  endsAt: number;
  trialToken: string;
}): Promise<boolean> => {
  const normalizedDeviceId = deviceId.trim().replace(/\s+/g, '').toUpperCase();
  const parsed = parseTrialToken(trialToken);

  if (!parsed || parsed.firstSeenAt !== firstSeenAt || parsed.endsAt !== endsAt) {
    return false;
  }

  if (parsed.endsAt <= Date.now()) {
    return false;
  }

  const publicKey = await importPublicKey();
  if (!publicKey) return false;

  const signatureBytes = decodeBase64(parsed.signatureB64);
  if (signatureBytes.length !== 64) {
    return false;
  }

  const message = buildTrialMessage({
    deviceId: normalizedDeviceId,
    firstSeenAt: parsed.firstSeenAt,
    endsAt: parsed.endsAt,
  });
  const messageBytes = new TextEncoder().encode(message);

  return crypto.subtle.verify(
    {name: 'Ed25519'},
    publicKey,
    signatureBytes,
    messageBytes,
  );
};

export const evaluateOfflineTrialAccess = async (deviceId: string): Promise<boolean> => {
  const trialState = getTrialState();
  const trialToken = localStorage.getItem(TRIAL_TOKEN_KEY);
  const normalizedDeviceId = deviceId.trim().replace(/\s+/g, '').toUpperCase();

  if (
    !trialToken ||
    !trialState.firstSeenAt ||
    !trialState.trialEndsAt ||
    !trialState.isActive
  ) {
    return false;
  }

  return verifyTrialToken({
    deviceId: normalizedDeviceId,
    firstSeenAt: trialState.firstSeenAt,
    endsAt: trialState.trialEndsAt,
    trialToken,
  });
};

export const fetchTrialBootstrap = async (
  deviceId: string,
  cachedTrialState?: Pick<TrialState, 'firstSeenAt' | 'trialEndsAt'>,
): Promise<TrialBootstrapResult> => {
  const payload: Record<string, string | number> = {deviceId};

  if (cachedTrialState?.firstSeenAt && cachedTrialState?.trialEndsAt) {
    payload.cachedFirstSeenAt = cachedTrialState.firstSeenAt;
    payload.cachedEndsAt = cachedTrialState.trialEndsAt;
  }

  const response = await fetch(TRIAL_BOOTSTRAP_ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Trial bootstrap failed with ${response.status}`);
  }

  const data = await response.json();
  const firstSeenAt = Number(data?.firstSeenAt);
  const trialEndsAt = Number(data?.endsAt);
  const serverNow = Number(data?.serverNow);
  const status = data?.status;
  const trialToken =
    typeof data?.trialToken === 'string' && data.trialToken.trim() !== ''
      ? data.trialToken
      : null;

  if (
    (status !== 'TRIAL' && status !== 'LOCKED') ||
    !Number.isFinite(firstSeenAt) ||
    firstSeenAt <= 0 ||
    !Number.isFinite(trialEndsAt) ||
    trialEndsAt <= 0 ||
    !Number.isFinite(serverNow) ||
    serverNow <= 0
  ) {
    throw new Error('Trial bootstrap response was invalid');
  }

  if (status === 'TRIAL' && trialToken === null) {
    throw new Error('Trial bootstrap response was missing trialToken');
  }

  return {
    status,
    serverNow,
    firstSeenAt,
    trialEndsAt,
    trialToken,
  };
};

export const ensureTrialInitialized = async (
  deviceId: string,
): Promise<TrialInitializationResult> => {
  const cachedTrialState = getTrialState();

  if (cachedTrialState.firstSeenAt && cachedTrialState.trialEndsAt) {
    try {
      const bootstrap = await fetchTrialBootstrap(deviceId, cachedTrialState);
      persistTrialState({
        firstSeenAt: bootstrap.firstSeenAt,
        trialEndsAt: bootstrap.trialEndsAt,
        lastTrustedServerTime: bootstrap.serverNow,
        trialToken: bootstrap.status === 'TRIAL' ? bootstrap.trialToken : null,
      });

      return {
        firstSeenAt: bootstrap.firstSeenAt,
        trialEndsAt: bootstrap.trialEndsAt,
        initialized: true,
        requiresOnlineInitialization: false,
        isTrialValid: bootstrap.status === 'TRIAL',
      };
    } catch {
      const isTrialValid = await evaluateOfflineTrialAccess(deviceId);
      return {
        firstSeenAt: cachedTrialState.firstSeenAt,
        trialEndsAt: cachedTrialState.trialEndsAt,
        initialized: true,
        requiresOnlineInitialization: false,
        isTrialValid,
      };
    }
  }

  try {
    const bootstrap = await fetchTrialBootstrap(deviceId);
    persistTrialState({
      firstSeenAt: bootstrap.firstSeenAt,
      trialEndsAt: bootstrap.trialEndsAt,
      lastTrustedServerTime: bootstrap.serverNow,
      trialToken: bootstrap.status === 'TRIAL' ? bootstrap.trialToken : null,
    });

    return {
      firstSeenAt: bootstrap.firstSeenAt,
      trialEndsAt: bootstrap.trialEndsAt,
      initialized: true,
      requiresOnlineInitialization: false,
      isTrialValid: bootstrap.status === 'TRIAL',
    };
  } catch {
    return {
      firstSeenAt: null,
      trialEndsAt: null,
      initialized: false,
      requiresOnlineInitialization: true,
      isTrialValid: false,
    };
  }
};

export const getTrialState = (): TrialState => {
  const firstSeenAt = parseStoredTimestamp(localStorage.getItem(TRIAL_FIRST_SEEN_KEY));
  const trialEndsAt = parseStoredTimestamp(localStorage.getItem(TRIAL_ENDS_AT_KEY));
  const lastTrustedServerTime = parseStoredTimestamp(
    localStorage.getItem(TRIAL_LAST_TRUSTED_SERVER_TIME_KEY),
  );

  if (!firstSeenAt || !trialEndsAt) {
    return {
      firstSeenAt: null,
      trialEndsAt: null,
      lastTrustedServerTime,
      isActive: false,
      isExpired: false,
    };
  }

  const now = Date.now();

  return {
    firstSeenAt,
    trialEndsAt,
    lastTrustedServerTime,
    isActive: now < trialEndsAt,
    isExpired: now >= trialEndsAt,
  };
};

export const clearTrialState = (): void => {
  localStorage.removeItem(TRIAL_FIRST_SEEN_KEY);
  localStorage.removeItem(TRIAL_ENDS_AT_KEY);
  localStorage.removeItem(TRIAL_LAST_TRUSTED_SERVER_TIME_KEY);
  localStorage.removeItem(TRIAL_TOKEN_KEY);
};

export const resolveAccessState = ({
  hasStoredToken,
  isLicenseValid,
  isTrialAvailable,
}: {
  hasStoredToken: boolean;
  isLicenseValid: boolean;
  isTrialAvailable: boolean;
}): {
  accessSource: 'LICENSE' | 'TRIAL' | 'LOCKED';
  isPremium: boolean;
  isLocked: boolean;
  isTrialActive: boolean;
} => {
  if (hasStoredToken && isLicenseValid) {
    return {
      accessSource: 'LICENSE',
      isPremium: true,
      isLocked: false,
      isTrialActive: false,
    };
  }

  if (hasStoredToken && !isLicenseValid) {
    return {
      accessSource: 'LOCKED',
      isPremium: false,
      isLocked: true,
      isTrialActive: false,
    };
  }

  if (isTrialAvailable) {
    return {
      accessSource: 'TRIAL',
      isPremium: true,
      isLocked: false,
      isTrialActive: true,
    };
  }

  return {
    accessSource: 'LOCKED',
    isPremium: false,
    isLocked: true,
    isTrialActive: false,
  };
};
