const FALLBACK_PURCHASE_URL = 'https://example.com/unlock-full-version';

export const getUpgradeUrl = () =>
  (import.meta.env.VITE_KOTO_PURCHASE_URL || '').trim() || FALLBACK_PURCHASE_URL;
