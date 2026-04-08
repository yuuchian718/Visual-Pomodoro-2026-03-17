import { randomUUID } from "node:crypto";

import { getStoreWithLocalFallback, isProductionRuntime } from "./local-dev-store.mjs";

const ANALYTICS_EVENT_KEY_PREFIX = "analytics-event";
const ANALYTICS_EVENT_PREFIX = `${ANALYTICS_EVENT_KEY_PREFIX}:`;
const DEFAULT_RECENT_LIMIT = 50;
const MAX_RECENT_LIMIT = 100;

const normalizeIsoTimestamp = (value) => {
  const normalized = String(value || "").trim();
  return normalized && !Number.isNaN(Date.parse(normalized))
    ? new Date(normalized).toISOString()
    : new Date().toISOString();
};

const buildAnalyticsEventStorageKey = (tsIso) =>
  `${ANALYTICS_EVENT_KEY_PREFIX}:${normalizeIsoTimestamp(tsIso)}:${randomUUID()}`;

const normalizeRecentLimit = (limit) => {
  const parsed = Number(limit);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_RECENT_LIMIT;
  }

  const floored = Math.floor(parsed);
  return Math.min(MAX_RECENT_LIMIT, Math.max(1, floored));
};

const parseTimestampMs = (value) => {
  const ms = Date.parse(String(value || ""));
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
};

export const getAnalyticsEventStoreName = () =>
  isProductionRuntime()
    ? "visual-pomodoro-analytics-event-prod"
    : "visual-pomodoro-analytics-event-testing";

export const getAnalyticsEventStore = () =>
  getStoreWithLocalFallback(getAnalyticsEventStoreName());

export const createAnalyticsEventRecord = async (store, record) => {
  const ts = normalizeIsoTimestamp(record?.ts);
  const key = buildAnalyticsEventStorageKey(ts);

  await store.setJSON(key, {
    ...record,
    ts,
  });

  return {
    key,
    ts,
  };
};

export const getRecentAnalyticsEvents = async (store, limit = DEFAULT_RECENT_LIMIT) => {
  const safeLimit = normalizeRecentLimit(limit);
  const listed = await store.list({ prefix: ANALYTICS_EVENT_PREFIX });
  const blobs = Array.isArray(listed?.blobs) ? listed.blobs : [];

  if (!blobs.length) {
    return [];
  }

  const loadedRecords = await Promise.all(
    blobs.map(async (blob, index) => {
      const key = String(blob?.key || "");
      if (!key) return null;

      const record = await store.get(key, { type: "json" });
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        return null;
      }

      return {
        key,
        record,
        tsMs: parseTimestampMs(record.ts),
        index,
      };
    }),
  );

  return loadedRecords
    .filter((entry) => entry !== null)
    .sort((a, b) => {
      if (b.tsMs !== a.tsMs) return b.tsMs - a.tsMs;
      const keyOrder = b.key.localeCompare(a.key);
      if (keyOrder !== 0) return keyOrder;
      return a.index - b.index;
    })
    .slice(0, safeLimit)
    .map((entry) => entry.record);
};
