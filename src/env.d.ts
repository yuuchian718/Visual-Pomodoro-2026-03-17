interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_KOTO_PURCHASE_URL?: string;
  readonly VITE_KOTO_PUBLIC_KEY_B64: string;
  readonly VITE_KOTO_TRIAL_PUBLIC_KEY_B64: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.json' {
  const value: {
    trialDays: number;
  };

  export default value;
}
