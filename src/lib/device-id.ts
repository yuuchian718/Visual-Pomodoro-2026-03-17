const STORAGE_KEY = 'koto_device_id';

function randomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < 12; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return `LL-${result}`;
}

export function normalizeDeviceId(deviceId: string): string {
  return deviceId.trim().replace(/\s+/g, '').toUpperCase();
}

export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY);

  if (!id) {
    id = randomId();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  }

  const normalizedId = normalizeDeviceId(id);

  if (normalizedId !== id) {
    localStorage.setItem(STORAGE_KEY, normalizedId);
  }

  return normalizedId;
}
