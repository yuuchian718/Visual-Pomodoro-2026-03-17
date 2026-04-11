export const STUDY_RECORD_STORAGE_KEY = 'visual-pomodoro-study-record-v1';

export interface StudyRecord {
  totalSeconds: number;
  todayDate: string;
  todaySeconds: number;
  streakDays: number;
  lastCheckInDate: string | null;
  updatedAt: number;
}

const SECONDS_PER_DAY = 24 * 60 * 60;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const startOfLocalDay = (timestampMs: number) => {
  const date = new Date(timestampMs);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const toLocalDateKey = (timestampMs: number) => {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKeyToLocalMidnight = (dateKey: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const midnight = new Date(year, month - 1, day).getTime();
  return Number.isFinite(midnight) ? midnight : null;
};

const dayDiff = (fromDateKey: string, toDateKey: string) => {
  const from = parseDateKeyToLocalMidnight(fromDateKey);
  const to = parseDateKeyToLocalMidnight(toDateKey);

  if (from === null || to === null) {
    return null;
  }

  return Math.round((to - from) / MILLIS_PER_DAY);
};

const createDefaultStudyRecord = (nowMs: number): StudyRecord => ({
  totalSeconds: 0,
  todayDate: toLocalDateKey(nowMs),
  todaySeconds: 0,
  streakDays: 0,
  lastCheckInDate: null,
  updatedAt: nowMs,
});

const normalizeStudyRecord = (raw: unknown, nowMs: number): StudyRecord => {
  const fallback = createDefaultStudyRecord(nowMs);
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const input = raw as Partial<StudyRecord>;
  const totalSeconds = isFiniteNumber(input.totalSeconds) ? Math.max(0, Math.floor(input.totalSeconds)) : 0;
  const todaySeconds = isFiniteNumber(input.todaySeconds) ? Math.max(0, Math.floor(input.todaySeconds)) : 0;
  const streakDays = isFiniteNumber(input.streakDays) ? Math.max(0, Math.floor(input.streakDays)) : 0;
  const updatedAt = isFiniteNumber(input.updatedAt) ? input.updatedAt : nowMs;
  const todayDate = typeof input.todayDate === 'string' ? input.todayDate : fallback.todayDate;
  const lastCheckInDate =
    typeof input.lastCheckInDate === 'string' && input.lastCheckInDate.trim() !== ''
      ? input.lastCheckInDate
      : null;

  const normalized: StudyRecord = {
    totalSeconds,
    todayDate,
    todaySeconds,
    streakDays,
    lastCheckInDate,
    updatedAt,
  };

  return resetTodayIfNeeded(normalized, nowMs);
};

const resetTodayIfNeeded = (record: StudyRecord, nowMs: number): StudyRecord => {
  const todayKey = toLocalDateKey(nowMs);
  if (record.todayDate === todayKey) {
    return record;
  }

  return {
    ...record,
    todayDate: todayKey,
    todaySeconds: 0,
    updatedAt: nowMs,
  };
};

const markCheckInDay = (record: StudyRecord, dateKey: string): StudyRecord => {
  if (record.lastCheckInDate === dateKey) {
    return record;
  }

  if (!record.lastCheckInDate) {
    return {
      ...record,
      streakDays: 1,
      lastCheckInDate: dateKey,
    };
  }

  const diff = dayDiff(record.lastCheckInDate, dateKey);
  if (diff === 1) {
    return {
      ...record,
      streakDays: Math.max(1, record.streakDays) + 1,
      lastCheckInDate: dateKey,
    };
  }

  return {
    ...record,
    streakDays: 1,
    lastCheckInDate: dateKey,
  };
};

const addSecondsOnDate = (record: StudyRecord, dateKey: string, seconds: number, nowMs: number): StudyRecord => {
  if (seconds <= 0) {
    return record;
  }

  let next = {
    ...record,
    totalSeconds: record.totalSeconds + seconds,
    updatedAt: nowMs,
  };

  if (next.todayDate === dateKey) {
    next = {
      ...next,
      todaySeconds: next.todaySeconds + seconds,
    };
  }

  return markCheckInDay(next, dateKey);
};

export const loadStudyRecord = (nowMs = Date.now()): StudyRecord => {
  try {
    const raw = window.localStorage.getItem(STUDY_RECORD_STORAGE_KEY);
    if (!raw) {
      return createDefaultStudyRecord(nowMs);
    }

    const parsed = JSON.parse(raw);
    return normalizeStudyRecord(parsed, nowMs);
  } catch {
    return createDefaultStudyRecord(nowMs);
  }
};

export const saveStudyRecord = (record: StudyRecord): StudyRecord => {
  try {
    window.localStorage.setItem(STUDY_RECORD_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Keep app behavior stable even if localStorage write fails.
  }
  return record;
};

export const loadAndSyncStudyRecord = (nowMs = Date.now()): StudyRecord => {
  const record = loadStudyRecord(nowMs);
  const synced = resetTodayIfNeeded(record, nowMs);
  if (synced !== record) {
    saveStudyRecord(synced);
  }
  return synced;
};

export const resetStudyRecord = (nowMs = Date.now()): StudyRecord => {
  const reset = createDefaultStudyRecord(nowMs);
  return saveStudyRecord(reset);
};

export const addStudySegment = (
  startMs: number,
  endMs: number,
  nowMs = Date.now(),
): StudyRecord => {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return loadAndSyncStudyRecord(nowMs);
  }

  let record = loadAndSyncStudyRecord(nowMs);

  let cursor = Math.floor(startMs / 1000);
  const endSec = Math.floor(endMs / 1000);

  while (cursor < endSec) {
    const dayStartMs = startOfLocalDay(cursor * 1000);
    const dayEndSec = Math.floor((dayStartMs + MILLIS_PER_DAY) / 1000);
    const chunkEnd = Math.min(endSec, dayEndSec);
    const seconds = Math.max(0, chunkEnd - cursor);

    if (seconds > 0) {
      const dateKey = toLocalDateKey(cursor * 1000);
      record = addSecondsOnDate(record, dateKey, seconds, nowMs);
    }

    cursor = chunkEnd;
  }

  return saveStudyRecord(record);
};
