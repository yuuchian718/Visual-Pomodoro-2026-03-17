const FALLBACK_PURCHASE_URL = 'https://nipponvocab.theshop.jp/items/140221947';

export const getUpgradeUrl = () =>
  (import.meta.env.VITE_KOTO_PURCHASE_URL || '').trim() || FALLBACK_PURCHASE_URL;
