export const TOMATO_HARVEST_STORAGE_KEY = 'visual-pomodoro-tomato-harvest-v1';
const TOMATO_HARVEST_VERSION = 1;
const TEST_TOMATO_ID_PREFIX = 'test-tomato-';
export const SCATTER_VISIBLE_CAP = 8;

export type TomatoSizeTier = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type TomatoDamageTier = 'FULL' | 'LIGHT' | 'HALF' | 'HEAVY';
export type TomatoLocation = 'SCATTER' | 'TRAY';
export interface TomatoCustomPosition {
  xPct: number;
  yPct: number;
}

export interface TomatoHarvestEntry {
  id: string;
  targetMinutes: number;
  actualSeconds: number;
  actualMinutesDisplay: number;
  completionRatio: number;
  sizeTier: TomatoSizeTier;
  damageTier: TomatoDamageTier;
  location: TomatoLocation;
  createdAt: number;
  sessionDateKey: string;
  sessionMonthKey: string;
  customPosition?: TomatoCustomPosition;
}

interface TomatoHarvestState {
  version: number;
  entries: TomatoHarvestEntry[];
  updatedAt: number;
}

const dateKeyFromTime = (timestampMs: number) => {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const monthKeyFromTime = (timestampMs: number) => {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const defaultState = (nowMs: number): TomatoHarvestState => ({
  version: TOMATO_HARVEST_VERSION,
  entries: [],
  updatedAt: nowMs,
});

const parseState = (raw: unknown, nowMs: number): TomatoHarvestState => {
  const fallback = defaultState(nowMs);
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const input = raw as Partial<TomatoHarvestState>;
  const entries = Array.isArray(input.entries) ? input.entries : [];
  const updatedAt = typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt) ? input.updatedAt : nowMs;

  return {
    version: TOMATO_HARVEST_VERSION,
    entries: entries.filter((entry): entry is TomatoHarvestEntry => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }
      const record = entry as Partial<TomatoHarvestEntry>;
      return (
        typeof record.id === 'string' &&
        typeof record.targetMinutes === 'number' &&
        typeof record.actualSeconds === 'number' &&
        typeof record.actualMinutesDisplay === 'number' &&
        typeof record.completionRatio === 'number' &&
        typeof record.sizeTier === 'string' &&
        typeof record.damageTier === 'string' &&
        typeof record.location === 'string' &&
        typeof record.createdAt === 'number' &&
        typeof record.sessionDateKey === 'string' &&
        typeof record.sessionMonthKey === 'string' &&
        (record.customPosition === undefined ||
          (typeof record.customPosition === 'object' &&
            record.customPosition !== null &&
            typeof (record.customPosition as TomatoCustomPosition).xPct === 'number' &&
            typeof (record.customPosition as TomatoCustomPosition).yPct === 'number'))
      );
    }),
    updatedAt,
  };
};

const readRawState = (nowMs: number): TomatoHarvestState => {
  if (typeof window === 'undefined') {
    return defaultState(nowMs);
  }

  try {
    const raw = window.localStorage.getItem(TOMATO_HARVEST_STORAGE_KEY);
    if (!raw) {
      return defaultState(nowMs);
    }
    return parseState(JSON.parse(raw), nowMs);
  } catch {
    return defaultState(nowMs);
  }
};

const writeRawState = (state: TomatoHarvestState): TomatoHarvestState => {
  if (typeof window === 'undefined') {
    return state;
  }

  try {
    window.localStorage.setItem(TOMATO_HARVEST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures to keep runtime behavior stable.
  }

  return state;
};

const applyLazyCleanup = (state: TomatoHarvestState, nowMs: number): TomatoHarvestState => {
  const todayKey = dateKeyFromTime(nowMs);
  const currentMonthKey = monthKeyFromTime(nowMs);

  const entries = state.entries.filter((entry) => {
    // Daily reset for incomplete tomatoes
    if (entry.damageTier !== 'FULL' && entry.sessionDateKey !== todayKey) {
      return false;
    }

    // Monthly reset for tray tomatoes
    if (entry.location === 'TRAY' && entry.sessionMonthKey !== currentMonthKey) {
      return false;
    }

    return true;
  });

  if (entries.length === state.entries.length) {
    return state;
  }

  return {
    ...state,
    entries,
    updatedAt: nowMs,
  };
};

export const loadTomatoHarvestState = (nowMs = Date.now()): TomatoHarvestState => {
  const parsed = readRawState(nowMs);
  const cleaned = applyLazyCleanup(parsed, nowMs);
  if (cleaned !== parsed) {
    writeRawState(cleaned);
  }
  return cleaned;
};

export const saveTomatoHarvestState = (state: TomatoHarvestState): TomatoHarvestState =>
  writeRawState({
    ...state,
    version: TOMATO_HARVEST_VERSION,
    updatedAt: Date.now(),
  });

export const resolveTomatoSizeTier = (targetMinutes: number): TomatoSizeTier => {
  if (targetMinutes <= 10) return 'XS';
  if (targetMinutes <= 25) return 'S';
  if (targetMinutes <= 50) return 'M';
  if (targetMinutes <= 80) return 'L';
  if (targetMinutes <= 120) return 'XL';
  return 'XXL';
};

export const resolveTomatoDamageTier = (completionRatio: number): TomatoDamageTier => {
  if (completionRatio >= 0.66) return 'LIGHT';
  if (completionRatio >= 0.33) return 'HALF';
  return 'HEAVY';
};

export const formatTomatoDurationLabel = ({
  damageTier,
  targetMinutes,
  actualSeconds,
}: Pick<TomatoHarvestEntry, 'damageTier' | 'targetMinutes' | 'actualSeconds'>): string => {
  const seconds =
    damageTier === 'FULL' ? Math.max(0, Math.floor(targetMinutes)) * 60 : Math.max(0, Math.floor(actualSeconds));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return remainSeconds > 0 ? `${minutes}m${remainSeconds}s` : `${minutes}m`;
};

export const createTomatoHarvestEntry = ({
  targetMinutes,
  actualSeconds,
  createdAt = Date.now(),
  location = 'SCATTER',
}: {
  targetMinutes: number;
  actualSeconds: number;
  createdAt?: number;
  location?: TomatoLocation;
}): TomatoHarvestEntry => {
  const safeTarget = Math.max(1, Math.floor(targetMinutes));
  const safeSeconds = Math.max(0, Math.floor(actualSeconds));
  const targetSeconds = safeTarget * 60;
  const completionRatio = Math.max(0, Math.min(1, safeSeconds / targetSeconds));
  const actualMinutesDisplay = safeSeconds > 0 ? Math.max(1, Math.round(safeSeconds / 60)) : 0;

  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 10)}`,
    targetMinutes: safeTarget,
    actualSeconds: safeSeconds,
    actualMinutesDisplay,
    completionRatio,
    sizeTier: resolveTomatoSizeTier(safeTarget),
    damageTier: resolveTomatoDamageTier(completionRatio),
    location,
    createdAt,
    sessionDateKey: dateKeyFromTime(createdAt),
    sessionMonthKey: monthKeyFromTime(createdAt),
  };
};

export const appendTomatoHarvestEntry = (entry: TomatoHarvestEntry, nowMs = Date.now()): TomatoHarvestState => {
  const state = loadTomatoHarvestState(nowMs);
  const next: TomatoHarvestState = {
    ...state,
    entries: [...state.entries, entry],
    updatedAt: nowMs,
  };
  return saveTomatoHarvestState(next);
};

export const updateTomatoCustomPosition = (
  id: string,
  position: TomatoCustomPosition,
  nowMs = Date.now(),
): TomatoHarvestState => {
  const state = loadTomatoHarvestState(nowMs);
  const next: TomatoHarvestState = {
    ...state,
    entries: state.entries.map((entry) =>
      entry.id === id ? {...entry, customPosition: {xPct: position.xPct, yPct: position.yPct}} : entry,
    ),
    updatedAt: nowMs,
  };
  return saveTomatoHarvestState(next);
};

export const removeTomatoHarvestEntry = (id: string, nowMs = Date.now()): TomatoHarvestState => {
  // Deletion must be single-target and should not implicitly trigger daily/monthly cleanup
  // that can remove unrelated entries in the same user action.
  const state = readRawState(nowMs);
  const next: TomatoHarvestState = {
    ...state,
    entries: state.entries.filter((entry) => entry.id !== id),
    updatedAt: nowMs,
  };
  return saveTomatoHarvestState(next);
};

export const removeAllIncompleteTomatoes = (nowMs = Date.now()): TomatoHarvestState => {
  // Keep this as a strict data operation without lazy-cleanup side effects
  // so one user action maps to one deterministic result.
  const state = readRawState(nowMs);
  const next: TomatoHarvestState = {
    ...state,
    entries: state.entries.filter((entry) => entry.damageTier === 'FULL'),
    updatedAt: nowMs,
  };
  return saveTomatoHarvestState(next);
};

export const moveFullScatterTomatoesToTray = (nowMs = Date.now()): TomatoHarvestState => {
  const state = loadTomatoHarvestState(nowMs);
  const currentMonthKey = monthKeyFromTime(nowMs);

  const next: TomatoHarvestState = {
    ...state,
    entries: state.entries.map((entry) => {
      if (entry.location === 'SCATTER' && entry.damageTier === 'FULL') {
        return {
          ...entry,
          location: 'TRAY',
          sessionMonthKey: currentMonthKey,
        };
      }
      return entry;
    }),
    updatedAt: nowMs,
  };

  return saveTomatoHarvestState(next);
};

export const moveScatterFullTomatoToTrayById = (id: string, nowMs = Date.now()): TomatoHarvestState => {
  const state = loadTomatoHarvestState(nowMs);
  const currentMonthKey = monthKeyFromTime(nowMs);

  const next: TomatoHarvestState = {
    ...state,
    entries: state.entries.map((entry) => {
      if (entry.id === id && entry.location === 'SCATTER' && entry.damageTier === 'FULL') {
        return {
          ...entry,
          location: 'TRAY',
          sessionMonthKey: currentMonthKey,
        };
      }
      return entry;
    }),
    updatedAt: nowMs,
  };

  return saveTomatoHarvestState(next);
};

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

export const seedTomatoHarvestTestData = (nowMs = Date.now()): TomatoHarvestState => {
  const baseRows = [
    {targetMinutes: 5, damageTier: 'FULL', location: 'SCATTER' as TomatoLocation, ratio: 1},
    {targetMinutes: 10, damageTier: 'LIGHT', location: 'SCATTER' as TomatoLocation, ratio: 0.84},
    {targetMinutes: 15, damageTier: 'HALF', location: 'SCATTER' as TomatoLocation, ratio: 0.52},
    {targetMinutes: 25, damageTier: 'HEAVY', location: 'SCATTER' as TomatoLocation, ratio: 0.24},
    {targetMinutes: 30, damageTier: 'FULL', location: 'SCATTER' as TomatoLocation, ratio: 1},
    {targetMinutes: 45, damageTier: 'LIGHT', location: 'SCATTER' as TomatoLocation, ratio: 0.77},
    {targetMinutes: 50, damageTier: 'HALF', location: 'SCATTER' as TomatoLocation, ratio: 0.43},
    {targetMinutes: 70, damageTier: 'HEAVY', location: 'SCATTER' as TomatoLocation, ratio: 0.18},
    {targetMinutes: 80, damageTier: 'FULL', location: 'SCATTER' as TomatoLocation, ratio: 1},
    {targetMinutes: 90, damageTier: 'LIGHT', location: 'SCATTER' as TomatoLocation, ratio: 0.71},
    {targetMinutes: 120, damageTier: 'HALF', location: 'TRAY' as TomatoLocation, ratio: 0.51},
    {targetMinutes: 180, damageTier: 'HEAVY', location: 'TRAY' as TomatoLocation, ratio: 0.22},
    {targetMinutes: 240, damageTier: 'FULL', location: 'TRAY' as TomatoLocation, ratio: 1},
    {targetMinutes: 25, damageTier: 'LIGHT', location: 'TRAY' as TomatoLocation, ratio: 0.9},
    {targetMinutes: 45, damageTier: 'HALF', location: 'TRAY' as TomatoLocation, ratio: 0.58},
    {targetMinutes: 60, damageTier: 'HEAVY', location: 'TRAY' as TomatoLocation, ratio: 0.14},
    {targetMinutes: 12, damageTier: 'FULL', location: 'TRAY' as TomatoLocation, ratio: 1},
    {targetMinutes: 35, damageTier: 'LIGHT', location: 'TRAY' as TomatoLocation, ratio: 0.68},
    {targetMinutes: 55, damageTier: 'HALF', location: 'TRAY' as TomatoLocation, ratio: 0.49},
    {targetMinutes: 110, damageTier: 'HEAVY', location: 'TRAY' as TomatoLocation, ratio: 0.27},
  ];

  const seededEntries: TomatoHarvestEntry[] = baseRows.map((row, index) => {
    // Keep seeded rows within the same local day window so daily lazy cleanup
    // does not unexpectedly remove incomplete rows during verification refresh.
    const createdAt = nowMs - (20 - index) * 20 * 60 * 1000;
    const targetSeconds = row.targetMinutes * 60;
    const ratio = row.damageTier === 'FULL' ? 1 : clampRatio(row.ratio);
    const actualSeconds =
      row.damageTier === 'FULL' ? targetSeconds : Math.max(1, Math.min(targetSeconds - 1, Math.floor(targetSeconds * ratio)));
    const completionRatio = clampRatio(actualSeconds / targetSeconds);
    const actualMinutesDisplay = actualSeconds > 0 ? Math.max(1, Math.round(actualSeconds / 60)) : 0;

    return {
      id: `${TEST_TOMATO_ID_PREFIX}${createdAt}-${index}`,
      targetMinutes: row.targetMinutes,
      actualSeconds,
      actualMinutesDisplay,
      completionRatio,
      sizeTier: resolveTomatoSizeTier(row.targetMinutes),
      damageTier: row.damageTier as TomatoDamageTier,
      location: row.location,
      createdAt,
      sessionDateKey: dateKeyFromTime(createdAt),
      sessionMonthKey: monthKeyFromTime(nowMs),
    };
  });

  const next: TomatoHarvestState = {
    version: TOMATO_HARVEST_VERSION,
    entries: seededEntries,
    updatedAt: nowMs,
  };

  return saveTomatoHarvestState(next);
};

export const clearSeededTomatoHarvestTestData = (nowMs = Date.now()): TomatoHarvestState => {
  const state = loadTomatoHarvestState(nowMs);
  const next: TomatoHarvestState = {
    ...state,
    entries: state.entries.filter((entry) => !entry.id.startsWith(TEST_TOMATO_ID_PREFIX)),
    updatedAt: nowMs,
  };
  return saveTomatoHarvestState(next);
};
