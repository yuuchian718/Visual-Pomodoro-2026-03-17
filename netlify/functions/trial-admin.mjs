import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import {
  checkRateLimit,
  deriveRateLimitIdentity,
  getAuditStore,
  getRateStore,
  getTrialStore,
  hashDeviceId,
  isValidDeviceId,
  loadTrialRecordByDeviceHash,
  loadTrialRecordById,
  saveTrialRecord,
  writeAuditEntry,
} from "./lib/trial-store.mjs";

dotenv.config({ path: ".env.production", quiet: true });

const ADMIN_SECRET = process.env.KOTO_TRIAL_ADMIN_SECRET?.trim() || "";
const ADMIN_RATE_WINDOW_MS = 5 * 60 * 1000;
const ADMIN_RATE_LIMIT = 30;

const jsonResponse = (statusCode, body) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const getSubmittedSecret = async (request) => {
  const headerSecret = request.headers.get("x-koto-admin-secret")?.trim();
  if (headerSecret) return { secret: headerSecret, body: null };

  if (request.method === "POST") {
    const body = await request.json();
    return { secret: String(body?.secret || "").trim(), body };
  }

  return { secret: "", body: null };
};

const summarizeRecord = (record) => ({
  trialId: record.trialId,
  deviceHash: record.deviceHash,
  firstSeenAt: record.firstSeenAt,
  endsAt: record.endsAt,
  lastSeenAt: record.lastSeenAt,
  status: record.status,
  blockedReason: record.blockedReason,
  blockedAt: record.blockedAt,
});

const summarizeAuditEntry = (entry) => ({
  auditId: String(entry?.auditId || ""),
  action: String(entry?.action || ""),
  trialId: String(entry?.trialId || ""),
  deviceHash: entry?.deviceHash || null,
  reason: entry?.reason || null,
  performedAt: Number(entry?.performedAt || 0),
  actor: "admin-secret",
  recordStatusAfter: String(entry?.recordStatusAfter || ""),
});

const resolveRecord = async ({ store, trialId, deviceId, serverNow }) => {
  if (trialId) {
    return loadTrialRecordById(store, trialId, serverNow);
  }

  if (!deviceId || !isValidDeviceId(deviceId)) {
    return null;
  }

  const deviceHash = hashDeviceId(deviceId);
  return loadTrialRecordByDeviceHash(store, deviceHash, serverNow);
};

const loadRecentAuditEntries = async ({ store, trialId, limit }) => {
  const { blobs } = await store.list({ prefix: "audit:trial:" });
  const keys = blobs.map((blob) => blob.key).sort().reverse();
  const matchingEntries = [];

  for (const key of keys) {
    if (matchingEntries.length >= limit) break;

    const entry = await store.get(key, { type: "json" });
    const summary = summarizeAuditEntry(entry);
    if (!summary.auditId) continue;
    if (trialId && summary.trialId !== trialId) continue;
    matchingEntries.push(summary);
  }

  return matchingEntries;
};

export default async (request) => {
  if (!ADMIN_SECRET) {
    return jsonResponse(500, { error: "TRIAL_ADMIN_SECRET_MISSING" });
  }

  const url = new URL(request.url);
  const queryAction = url.searchParams.get("action") || "";
  const queryTrialId = url.searchParams.get("trialId") || "";
  const queryDeviceId = url.searchParams.get("deviceId") || "";

  const { secret, body } = await getSubmittedSecret(request);
  if (!secret) {
    return jsonResponse(401, { error: "ADMIN_SECRET_REQUIRED" });
  }

  if (secret !== ADMIN_SECRET) {
    return jsonResponse(403, { error: "ADMIN_SECRET_INVALID" });
  }

  const rateStore = getRateStore();
  const rateKey = deriveRateLimitIdentity({
    request,
    prefix: "rate:admin",
    fallback: "admin",
  });
  const rateResult = await checkRateLimit({
    store: rateStore,
    key: rateKey,
    now: Date.now(),
    windowMs: ADMIN_RATE_WINDOW_MS,
    limit: ADMIN_RATE_LIMIT,
  });

  if (!rateResult.allowed) {
    return jsonResponse(429, { error: "ADMIN_RATE_LIMITED" });
  }

  const action = queryAction || String(body?.action || "").trim();
  const trialId = queryTrialId || String(body?.trialId || "").trim();
  const deviceId = queryDeviceId || String(body?.deviceId || "").trim();
  const serverNow = Date.now();
  const store = getTrialStore();
  const auditStore = getAuditStore();

  if (request.method === "GET" && action === "audit") {
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || body?.limit || 20)),
    );

    return jsonResponse(200, {
      ok: true,
      entries: await loadRecentAuditEntries({ store: auditStore, trialId, limit }),
    });
  }

  const record = await resolveRecord({ store, trialId, deviceId, serverNow });

  if (!record) {
    return jsonResponse(404, { error: "TRIAL_RECORD_NOT_FOUND" });
  }

  if (request.method === "GET" && action === "lookup") {
    return jsonResponse(200, { ok: true, record: summarizeRecord(record) });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (action === "block") {
    let status = "BLOCKED";
    const updatedRecord = {
      ...record,
      status,
      blockedReason: String(body?.reason || "").trim() || "BLOCKED_BY_ADMIN",
      blockedAt: serverNow,
      lastSeenAt: serverNow,
    };

    await saveTrialRecord(store, updatedRecord);
    await writeAuditEntry({
      store: auditStore,
      auditId: randomUUID(),
      action: "block",
      trialId: updatedRecord.trialId,
      deviceHash: updatedRecord.deviceHash,
      reason: updatedRecord.blockedReason,
      performedAt: serverNow,
      recordStatusAfter: status,
    });
    return jsonResponse(200, { ok: true, record: summarizeRecord(updatedRecord) });
  }

  if (action === "unblock") {
    let status = serverNow >= record.endsAt ? "EXPIRED" : "TRIAL";
    const updatedRecord = {
      ...record,
      status,
      blockedReason: null,
      blockedAt: null,
      lastSeenAt: serverNow,
    };

    await saveTrialRecord(store, updatedRecord);
    await writeAuditEntry({
      store: auditStore,
      auditId: randomUUID(),
      action: "unblock",
      trialId: updatedRecord.trialId,
      deviceHash: updatedRecord.deviceHash,
      reason: String(body?.reason || "").trim() || null,
      performedAt: serverNow,
      recordStatusAfter: status,
    });
    return jsonResponse(200, { ok: true, record: summarizeRecord(updatedRecord) });
  }

  if (action === "lookup") {
    return jsonResponse(200, { ok: true, record: summarizeRecord(record) });
  }

  return jsonResponse(400, { error: "INVALID_ACTION" });
};
