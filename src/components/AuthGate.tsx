import React from 'react';
import {resolveStartupAccess, type AccessState} from '../lib/access';
import {clearStoredLicenseToken, setStoredLicenseToken} from '../lib/license';
import {LockScreen} from './LockScreen';

interface AuthRenderProps {
  accessState: AccessState;
  refreshAccess: () => Promise<void>;
  saveLicenseToken: (token: string) => Promise<void>;
  clearLicenseToken: () => Promise<void>;
}

interface AuthGateProps {
  children: (props: AuthRenderProps) => React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({children}) => {
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

  if (isLoading || !accessState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm uppercase tracking-[0.4em] text-white/45">
        Loading access
      </div>
    );
  }

  if (accessState.isLocked) {
    return (
      <LockScreen
        accessState={accessState}
        onSaveLicenseToken={saveLicenseToken}
        onClearLicenseToken={clearLicenseToken}
        onRefreshAccess={refreshAccess}
      />
    );
  }

  return (
    <>
      {children({
        accessState,
        refreshAccess,
        saveLicenseToken,
        clearLicenseToken,
      })}
    </>
  );
};
