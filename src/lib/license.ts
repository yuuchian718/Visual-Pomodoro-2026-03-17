import {LICENSE_TOKEN_KEY} from './trial';
import {normalizeDeviceId} from './device-id';

const LICENSE_PUBLIC_KEY_B64 = import.meta.env.VITE_KOTO_PUBLIC_KEY_B64 || '';

export interface ParsedLicenseToken {
  mode: 'PERMANENT' | 'EXPIRE';
  timestamp: string;
  signatureB64: string;
}

export interface LicenseValidationResult {
  hasStoredToken: boolean;
  token: string | null;
  isValid: boolean;
  isExpired: boolean;
  parsed: ParsedLicenseToken | null;
}

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
  if (!LICENSE_PUBLIC_KEY_B64) return null;

  const keyBytes = decodeBase64(LICENSE_PUBLIC_KEY_B64);

  try {
    return await crypto.subtle.importKey(
      keyBytes.length === 32 ? 'raw' : 'spki',
      keyBytes,
      {name: 'Ed25519'},
      false,
      ['verify'],
    );
  } catch {
    return null;
  }
};

export const getStoredLicenseToken = (): string | null => {
  const token = localStorage.getItem(LICENSE_TOKEN_KEY);

  if (!token) {
    return null;
  }

  const trimmed = token.trim();
  return trimmed === '' ? null : trimmed;
};

export const setStoredLicenseToken = (token: string): void => {
  localStorage.setItem(LICENSE_TOKEN_KEY, token.trim());
};

export const clearStoredLicenseToken = (): void => {
  localStorage.removeItem(LICENSE_TOKEN_KEY);
};

export const parseLicenseToken = (token: string): ParsedLicenseToken | null => {
  const parts = token.trim().split('.');

  if (parts.length === 4 && parts[0] === 'KOTO1') {
    const mode = parts[1];
    const timestamp = parts[2];
    const signatureB64 = parts[3];

    if ((mode !== 'PERMANENT' && mode !== 'EXPIRE') || !signatureB64) {
      return null;
    }

    if (mode === 'EXPIRE' && !/^\d+$/.test(timestamp)) {
      return null;
    }

    if (mode === 'PERMANENT' && timestamp !== '0') {
      return null;
    }

    return {
      mode,
      timestamp,
      signatureB64,
    };
  }

  if (parts.length === 2 && parts[0] === 'KOTO1') {
    return {
      mode: 'PERMANENT',
      timestamp: '0',
      signatureB64: parts[1],
    };
  }

  return null;
};

const buildLicenseMessage = (deviceId: string, parsed: ParsedLicenseToken): string =>
  parsed.mode === 'EXPIRE'
    ? `KOTO|${deviceId}|EXPIRE|${parsed.timestamp}`
    : `KOTO|${deviceId}|PERMANENT`;

export const validateLicenseToken = async (
  token: string,
  deviceId: string,
): Promise<LicenseValidationResult> => {
  const parsed = parseLicenseToken(token);

  if (!parsed) {
    return {
      hasStoredToken: true,
      token,
      isValid: false,
      isExpired: false,
      parsed: null,
    };
  }

  const publicKey = await importPublicKey();
  const signatureBytes = decodeBase64(parsed.signatureB64);

  if (!publicKey || signatureBytes.length !== 64) {
    return {
      hasStoredToken: true,
      token,
      isValid: false,
      isExpired: parsed.mode === 'EXPIRE' && Math.floor(Date.now() / 1000) > Number(parsed.timestamp),
      parsed,
    };
  }

  const cleanId = normalizeDeviceId(deviceId);
  const verified = await crypto.subtle.verify(
    {name: 'Ed25519'},
    publicKey,
    signatureBytes,
    new TextEncoder().encode(buildLicenseMessage(cleanId, parsed)),
  );

  const isExpired =
    parsed.mode === 'EXPIRE' && Math.floor(Date.now() / 1000) > Number(parsed.timestamp);

  return {
    hasStoredToken: true,
    token,
    isValid: verified && !isExpired,
    isExpired,
    parsed,
  };
};

export const getStoredLicenseStatus = async (
  deviceId: string,
): Promise<LicenseValidationResult> => {
  const token = getStoredLicenseToken();

  if (!token) {
    return {
      hasStoredToken: false,
      token: null,
      isValid: false,
      isExpired: false,
      parsed: null,
    };
  }

  return validateLicenseToken(token, deviceId);
};
