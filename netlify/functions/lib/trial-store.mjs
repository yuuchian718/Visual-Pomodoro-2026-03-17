import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const DEVICE_ID_PATTERN = /^[A-Z0-9-]{6,32}$/;

export const normalizeDeviceId = (deviceId) =>
  String(deviceId || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

export const isValidDeviceId = (deviceId) =>
  DEVICE_ID_PATTERN.test(normalizeDeviceId(deviceId));

export const isValidTimestamp = (value) =>
  Number.isFinite(value) && value > 0;

export const parseSeedTimestamp = (value) => {
  const parsed = Number(value);
  return isValidTimestamp(parsed) ? parsed : null;
};

export const getStoreName = () =>
  process.env.CONTEXT === "production"
    ? "koto-trial-prod"
    : "koto-trial-testing";

export const getTrialStore = () => getStore(getStoreName());

export const getRateStoreName = () =>
  process.env.CONTEXT === "production"
    ? "koto-trial-rate-prod"
    : "koto-trial-rate-testing";

export const getRateStore = () => getStore(getRateStoreName());

export const getAuditStoreName = () =>
  process.env.CONTEXT === "production"
    ? "koto-trial-audit-prod"
    : "koto-trial-audit-testing";

export const getAuditStore = () => getStore(getAuditStoreName());

export const hashDeviceId = (deviceId) =>
  createHash("sha256").update(normalizeDeviceId(deviceId)).digest("hex");

export const hashIdentity = (value) =>
  createHash("sha256").update(String(value || "")).digest("hex");

export const parseCookieHeader = (cookieHeader) =>
  String(cookieHeader || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) return cookies;

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});

const normalizeStatus = (status, endsAt, serverNow) => {
  if (status === "BLOCKED") return "BLOCKED";
  if (serverNow >= endsAt) return "EXPIRED";
  return "TRIAL";
};

export const parseStoredRecord = (record, serverNow = Date.now()) => {
  if (!record || typeof record !== "object") return null;

  const firstSeenAt = Number(record.firstSeenAt);
  const endsAt = Number(record.endsAt);
  const deviceHash = String(record.deviceHash || "");
  const trialId = String(record.trialId || "");
  const lastSeenAt = Number(record.lastSeenAt);
  const blockedReason =
    typeof record.blockedReason === "string" && record.blockedReason.trim() !== ""
      ? record.blockedReason
      : null;
  const blockedAt = isValidTimestamp(Number(record.blockedAt))
    ? Number(record.blockedAt)
    : null;

  if (
    !trialId ||
    !deviceHash ||
    !isValidTimestamp(firstSeenAt) ||
    !isValidTimestamp(endsAt) ||
    !isValidTimestamp(lastSeenAt)
  ) {
    return null;
  }

  return {
    trialId,
    deviceHash,
    firstSeenAt,
    endsAt,
    lastSeenAt,
    status: normalizeStatus(record.status, endsAt, serverNow),
    blockedReason,
    blockedAt,
  };
};

export const loadTrialRecordById = async (
  store,
  trialId,
  serverNow = Date.now(),
) => parseStoredRecord(await store.get(`trial:id:${trialId}`, { type: "json" }), serverNow);

export const loadTrialRecordByDeviceHash = async (
  store,
  deviceHash,
  serverNow = Date.now(),
) => {
  const deviceLookup = await store.get(`trial:device:${deviceHash}`, {
    type: "json",
  });
  const linkedTrialId = String(deviceLookup?.trialId || "");
  return linkedTrialId
    ? loadTrialRecordById(store, linkedTrialId, serverNow)
    : null;
};

export const saveTrialRecord = async (store, record) => {
  await store.setJSON(`trial:id:${record.trialId}`, record);
  await store.setJSON(`trial:device:${record.deviceHash}`, {
    trialId: record.trialId,
  });
};

export const getRequestIp = (request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const netlifyIp = request.headers.get("x-nf-client-connection-ip")?.trim();
  if (netlifyIp) return netlifyIp;

  const clientIp = request.headers.get("client-ip")?.trim();
  return clientIp || "";
};

export const deriveRateLimitIdentity = ({
  request,
  prefix,
  fallback,
}) => {
  const requestIp = getRequestIp(request);

  if (requestIp) {
    return `${prefix}:${hashIdentity(`ip:${requestIp}`)}`;
  }

  if (fallback) {
    return `${prefix}:${hashIdentity(`fallback:${fallback}`)}`;
  }

  return `${prefix}:${hashIdentity("fallback:anonymous")}`;
};

export const checkRateLimit = async ({
  store,
  key,
  now,
  windowMs,
  limit,
}) => {
  const currentRate = await store.get(key, { type: "json" });
  const currentWindowStart = Number(currentRate?.windowStart);
  const currentCount = Number(currentRate?.count);
  const isCurrentWindowValid =
    Number.isFinite(currentWindowStart) &&
    Number.isFinite(currentCount) &&
    now - currentWindowStart < windowMs;

  if (!isCurrentWindowValid) {
    const nextRate = {
      windowStart: now,
      count: 1,
    };

    await store.setJSON(key, nextRate);
    return { allowed: true, currentRate: nextRate };
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      currentRate: {
        windowStart: currentWindowStart,
        count: currentCount,
      },
    };
  }

  const nextRate = {
    windowStart: currentWindowStart,
    count: currentRate.count + 1,
  };
  await store.setJSON(key, nextRate);

  return { allowed: true, currentRate: nextRate };
};

export const writeAuditEntry = async ({
  store,
  auditId,
  action,
  trialId,
  deviceHash,
  reason,
  performedAt,
  recordStatusAfter,
}) => {
  await store.setJSON(`audit:trial:${performedAt}:${auditId}`, {
    auditId,
    action,
    trialId,
    deviceHash: deviceHash || null,
    reason: reason || null,
    performedAt,
    actor: "admin-secret",
    recordStatusAfter,
  });
};
