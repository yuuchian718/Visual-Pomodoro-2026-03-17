import React from 'react';
import {resolveStartupAccess, type AccessState} from '../lib/access';
import {clearStoredLicenseToken, setStoredLicenseToken} from '../lib/license';
import {useLocale} from '../lib/locale';
import type {CommercialActivationResult} from './AuthPanel';

interface AuthRenderProps {
  accessState: AccessState;
  refreshAccess: () => Promise<void>;
  saveLicenseToken: (token: string) => Promise<void>;
  clearLicenseToken: () => Promise<void>;
  activateCommercialLicenseKey: (licenseKey: string) => Promise<CommercialActivationResult>;
}

interface AuthGateProps {
  children: (props: AuthRenderProps) => React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({children}) => {
  const {messages} = useLocale();
  const [accessState, setAccessState] = React.useState<AccessState | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshAccess = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const nextState = await resolveStartupAccess();
      setAccessState(nextState);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  const saveLicenseToken = React.useCallback(async (token: string) => {
    setStoredLicenseToken(token);
    await refreshAccess();
  }, [refreshAccess]);

  const clearLicenseToken = React.useCallback(async () => {
    clearStoredLicenseToken();
    await refreshAccess();
  }, [refreshAccess]);

  const activateCommercialLicenseKey = React.useCallback(async (licenseKey: string) => {
    const currentDeviceId = accessState?.deviceId?.trim();

    if (!currentDeviceId || licenseKey.trim() === '') {
      return {
        ok: false,
        error: 'INVALID_REQUEST',
      };
    }

    try {
      const response = await fetch('/.netlify/functions/license-activate', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey,
          deviceId: currentDeviceId,
        }),
      });

      const data = await response.json();

      return {
        ok: response.ok && data?.ok === true,
        result: typeof data?.result === 'string' ? data.result : undefined,
        error: typeof data?.error === 'string' ? data.error : undefined,
      };
    } catch {
      return {
        ok: false,
        error: 'ACTIVATION_REQUEST_FAILED',
      };
    }
  }, [accessState?.deviceId]);

  if (isLoading || !accessState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm uppercase tracking-[0.4em] text-white/45">
        {messages.authGateLoading}
      </div>
    );
  }

  return (
    <>
      {children({
        accessState,
        refreshAccess,
        saveLicenseToken,
        clearLicenseToken,
        activateCommercialLicenseKey,
      })}
    </>
  );
};
