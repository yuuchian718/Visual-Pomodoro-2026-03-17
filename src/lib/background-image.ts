export const BACKGROUND_IMAGE_STORAGE_KEY = 'visual-pomodoro-background-image';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const getDefaultStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const getStoredBackgroundImage = (storage: StorageLike | null = getDefaultStorage()) => {
  if (!storage) {
    return null;
  }

  const storedValue = storage.getItem(BACKGROUND_IMAGE_STORAGE_KEY);
  if (typeof storedValue !== 'string') {
    return null;
  }

  const normalizedValue = storedValue.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

export const resolveBackgroundImage = (
  defaultImage: string,
  storage: StorageLike | null = getDefaultStorage(),
) => getStoredBackgroundImage(storage) ?? defaultImage;

export const storeBackgroundImage = (
  imageDataUrl: string,
  storage: StorageLike | null = getDefaultStorage(),
) => {
  if (!storage) {
    return;
  }

  storage.setItem(BACKGROUND_IMAGE_STORAGE_KEY, imageDataUrl);
};

export const clearStoredBackgroundImage = (storage: StorageLike | null = getDefaultStorage()) => {
  if (!storage) {
    return;
  }

  storage.removeItem(BACKGROUND_IMAGE_STORAGE_KEY);
};
