import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BACKGROUND_IMAGE_STORAGE_KEY,
  clearStoredBackgroundImage,
  resolveBackgroundImage,
  storeBackgroundImage,
} from '../src/lib/background-image.ts';

const createStorage = () => {
  const data = new Map<string, string>();

  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
};

test('resolveBackgroundImage falls back to default when no stored wallpaper exists', () => {
  const storage = createStorage();

  assert.equal(resolveBackgroundImage('default-image', storage), 'default-image');
});

test('resolveBackgroundImage prefers the last stored wallpaper over the default image', () => {
  const storage = createStorage();

  storeBackgroundImage('data:image/png;base64,abc123', storage);

  assert.equal(
    resolveBackgroundImage('default-image', storage),
    'data:image/png;base64,abc123',
  );
  assert.equal(storage.getItem(BACKGROUND_IMAGE_STORAGE_KEY), 'data:image/png;base64,abc123');
});

test('clearStoredBackgroundImage removes the persisted wallpaper and restores default fallback', () => {
  const storage = createStorage();

  storeBackgroundImage('data:image/png;base64,abc123', storage);
  clearStoredBackgroundImage(storage);

  assert.equal(storage.getItem(BACKGROUND_IMAGE_STORAGE_KEY), null);
  assert.equal(resolveBackgroundImage('default-image', storage), 'default-image');
});
