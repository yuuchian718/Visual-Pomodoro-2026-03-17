import {
  createAnalyticsEventRecord,
  getAnalyticsEventStore,
} from "./analytics-event-store.mjs";

export const ANALYTICS_EVENT = Object.freeze({
  CLAIM_SUCCESS: "claim_success",
  ACTIVATION_SUCCESS: "activation_success",
  ACTIVATION_FAILED: "activation_failed",
  DEVICE_LIMIT_REACHED: "device_limit_reached",
});

const ALLOWED_EVENT_SET = new Set(Object.values(ANALYTICS_EVENT));

const BASE_FIELD_KEYS = ["event", "ts", "source", "resultCode"];
const OPTIONAL_FIELD_KEYS = [
  "deviceId",
  "issueId",
  "reused",
  "activationResult",
  "activationStatus",
  "maxDevices",
  "usedDevices",
  "remainingDevices",
];
const ALLOWED_FIELD_SET = new Set([...BASE_FIELD_KEYS, ...OPTIONAL_FIELD_KEYS]);

const normalizeStringField = (value) => {
  const normalized = String(value || "").trim();
  return normalized || null;
};

const normalizeOptionalNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const buildWritableAnalyticsPayload = (payload) => {
  const event = normalizeStringField(payload?.event);
  if (!event || !ALLOWED_EVENT_SET.has(event)) {
    return null;
  }

  const source = normalizeStringField(payload?.source);
  const resultCode = normalizeStringField(payload?.resultCode);

  if (!source || !resultCode) {
    return null;
  }

  const writable = {
    event,
    ts: payload?.ts,
    source,
    resultCode,
  };

  const deviceId = normalizeStringField(payload?.deviceId);
  if (deviceId) writable.deviceId = deviceId;

  const issueId = normalizeStringField(payload?.issueId);
  if (issueId) writable.issueId = issueId;

  if (typeof payload?.reused === "boolean") {
    writable.reused = payload.reused;
  }

  const activationResult = normalizeStringField(payload?.activationResult);
  if (activationResult) writable.activationResult = activationResult;

  const activationStatus = normalizeStringField(payload?.activationStatus);
  if (activationStatus) writable.activationStatus = activationStatus;

  const maxDevices = normalizeOptionalNumber(payload?.maxDevices);
  if (maxDevices !== null) writable.maxDevices = maxDevices;

  const usedDevices = normalizeOptionalNumber(payload?.usedDevices);
  if (usedDevices !== null) writable.usedDevices = usedDevices;

  const remainingDevices = normalizeOptionalNumber(payload?.remainingDevices);
  if (remainingDevices !== null) writable.remainingDevices = remainingDevices;

  // Defensive strip in case future edits accidentally pass extra fields.
  return Object.fromEntries(
    Object.entries(writable).filter(([key]) => ALLOWED_FIELD_SET.has(key)),
  );
};

export const recordAnalyticsEventSafely = async ({
  storeFactory = getAnalyticsEventStore,
  event,
  ts,
  source,
  resultCode,
  deviceId,
  issueId,
  reused,
  activationResult,
  activationStatus,
  maxDevices,
  usedDevices,
  remainingDevices,
} = {}) => {
  try {
    const payload = buildWritableAnalyticsPayload({
      event,
      ts,
      source,
      resultCode,
      deviceId,
      issueId,
      reused,
      activationResult,
      activationStatus,
      maxDevices,
      usedDevices,
      remainingDevices,
    });

    if (!payload) {
      return { ok: false, skipped: true };
    }

    const store = storeFactory();
    await createAnalyticsEventRecord(store, payload);
    return { ok: true };
  } catch (error) {
    console.warn("[analytics-recorder] failed to record event", {
      event,
      resultCode,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false };
  }
};

