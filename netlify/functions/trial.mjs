import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { signAsync } from "@noble/ed25519";
import trialConfig from "../../config/trial.json" with { type: "json" };
import {
  checkRateLimit,
  deriveRateLimitIdentity,
  getRateStore,
  getTrialStore,
  hashDeviceId,
  isValidDeviceId,
  parseCookieHeader,
  parseSeedTimestamp,
  loadTrialRecordById,
  loadTrialRecordByDeviceHash,
  normalizeDeviceId,
  saveTrialRecord,
} from "./lib/trial-store.mjs";

dotenv.config({ path: ".env.production", quiet: true });

const TRIAL_DAYS = Number(trialConfig.trialDays);
const TRIAL_DURATION_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
const TRIAL_COOKIE_NAME = "koto_trial_id";
const TRIAL_RATE_WINDOW_MS = 5 * 60 * 1000;
const TRIAL_RATE_LIMIT = 20;

const getTrialSeedFromEnv = () => {
  const seedB64 = process.env.KOTO_TRIAL_PRIVATE_KEY_B64?.trim();

  if (!seedB64) {
    throw new Error("TRIAL_SIGNING_KEY_MISSING");
  }

  const seed = Buffer.from(seedB64, "base64").slice(0, 32);

  if (seed.length !== 32) {
    throw new Error("TRIAL_SIGNING_KEY_MISSING");
  }

  return seed;
};

const buildTrialMessage = ({ deviceId, firstSeenAt, endsAt }) =>
  `KOTO1|TRIAL|${deviceId}|${firstSeenAt}|${endsAt}`;

const buildTrialToken = ({ firstSeenAt, endsAt, signatureB64 }) =>
  `KOTO1.TRIAL.${firstSeenAt}.${endsAt}.${signatureB64}`;

const jsonResponse = (statusCode, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });

const buildTrialCookie = (trialId) =>
  [
    `${TRIAL_COOKIE_NAME}=${encodeURIComponent(trialId)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=31536000",
    process.env.CONTEXT === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

const setTrialCookieHeader = (trialId) => ({
  "set-cookie": buildTrialCookie(trialId),
});

const getStatus = (serverNow, endsAt) =>
  serverNow < endsAt ? "TRIAL" : "LOCKED";

const issueTrialToken = async ({ deviceId, firstSeenAt, endsAt }) => {
  const message = buildTrialMessage({ deviceId, firstSeenAt, endsAt });
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await signAsync(messageBytes, getTrialSeedFromEnv());
  const signatureB64 = Buffer.from(signatureBytes).toString("base64");

  return buildTrialToken({
    firstSeenAt,
    endsAt,
    signatureB64,
  });
};

export default async (request) => {
  try {
    getTrialSeedFromEnv();
  } catch {
    return jsonResponse(500, { error: "TRIAL_SIGNING_KEY_MISSING" });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
  }

  const deviceId = normalizeDeviceId(body?.deviceId);
  if (!isValidDeviceId(deviceId)) {
    return jsonResponse(400, { ok: false, error: "Invalid deviceId" });
  }

  const deviceHash = hashDeviceId(deviceId);
  const rateStore = getRateStore();
  const rateKey = deriveRateLimitIdentity({
    request,
    prefix: "rate:bootstrap",
    fallback: deviceHash,
  });
  const rateResult = await checkRateLimit({
    store: rateStore,
    key: rateKey,
    now: Date.now(),
    windowMs: TRIAL_RATE_WINDOW_MS,
    limit: TRIAL_RATE_LIMIT,
  });

  if (!rateResult.allowed) {
    return jsonResponse(429, {
      ok: false,
      error: "TRIAL_RATE_LIMITED",
      retryable: true,
    });
  }

  const store = getTrialStore();
  const serverNow = Date.now();
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const cookieTrialId = cookies[TRIAL_COOKIE_NAME] || "";
  const debugCookieSeen = cookieTrialId !== "";
  let debugLookupSource = "none";
  let existingRecord = cookieTrialId
    ? await loadTrialRecordById(store, cookieTrialId, serverNow)
    : null;

  if (existingRecord) {
    debugLookupSource = "cookie";
  }

  const refreshRecord = async (record, nextDeviceHash = record.deviceHash) => {
    const refreshedRecord = {
      ...record,
      deviceHash: nextDeviceHash,
      lastSeenAt: serverNow,
    };

    await saveTrialRecord(store, refreshedRecord);
    return refreshedRecord;
  };

  if (!existingRecord) {
    existingRecord = await loadTrialRecordByDeviceHash(store, deviceHash, serverNow);
    if (existingRecord) {
      debugLookupSource = "deviceHash";
    }
  }

  if (existingRecord) {
    const refreshedRecord = await refreshRecord(existingRecord, deviceHash);
    if (existingRecord.status === "BLOCKED") {
      return jsonResponse(
        200,
        {
          ok: true,
          status: "LOCKED",
          serverNow,
          firstSeenAt: refreshedRecord.firstSeenAt,
          endsAt: refreshedRecord.endsAt,
          reason: existingRecord.blockedReason,
          trialToken: null,
          debugCookieSeen,
          debugLookupSource,
        },
        setTrialCookieHeader(refreshedRecord.trialId),
      );
    }

    if (serverNow >= refreshedRecord.endsAt) {
      const expiredRecord = await refreshRecord(
        {
          ...refreshedRecord,
          status: "EXPIRED",
          blockedReason: null,
          blockedAt: null,
        },
        deviceHash,
      );

      return jsonResponse(
        200,
        {
          ok: true,
          status: "LOCKED",
          serverNow,
          firstSeenAt: expiredRecord.firstSeenAt,
          endsAt: expiredRecord.endsAt,
          trialToken: null,
          debugCookieSeen,
          debugLookupSource,
        },
        setTrialCookieHeader(expiredRecord.trialId),
      );
    }

    return jsonResponse(
      200,
      {
        ok: true,
        status: getStatus(serverNow, refreshedRecord.endsAt),
        serverNow,
        firstSeenAt: refreshedRecord.firstSeenAt,
        endsAt: refreshedRecord.endsAt,
        trialToken:
          getStatus(serverNow, refreshedRecord.endsAt) === "TRIAL"
            ? await issueTrialToken({
                deviceId,
                firstSeenAt: refreshedRecord.firstSeenAt,
                endsAt: refreshedRecord.endsAt,
              })
            : null,
        debugCookieSeen,
        debugLookupSource,
      },
      setTrialCookieHeader(refreshedRecord.trialId),
    );
  }

  const cachedFirstSeenAt = parseSeedTimestamp(body?.cachedFirstSeenAt);
  const cachedEndsAt = parseSeedTimestamp(body?.cachedEndsAt);
  const trialId = randomUUID();
  const migratedRecord =
    cachedFirstSeenAt && cachedEndsAt && cachedEndsAt >= cachedFirstSeenAt
      ? {
          trialId,
          deviceHash,
          firstSeenAt: cachedFirstSeenAt,
          endsAt: cachedEndsAt,
          lastSeenAt: serverNow,
        }
      : null;

  const newRecord =
    migratedRecord || {
      trialId,
      deviceHash,
      firstSeenAt: serverNow,
      endsAt: serverNow + TRIAL_DURATION_MS,
      lastSeenAt: serverNow,
      status: "TRIAL",
      blockedReason: null,
      blockedAt: null,
    };
  debugLookupSource = migratedRecord ? "migration" : "new";

  await saveTrialRecord(store, newRecord);

  return jsonResponse(
    200,
    {
      ok: true,
      status: getStatus(serverNow, newRecord.endsAt),
      serverNow,
      firstSeenAt: newRecord.firstSeenAt,
      endsAt: newRecord.endsAt,
      trialToken:
        getStatus(serverNow, newRecord.endsAt) === "TRIAL"
          ? await issueTrialToken({
              deviceId,
              firstSeenAt: newRecord.firstSeenAt,
              endsAt: newRecord.endsAt,
            })
          : null,
      debugCookieSeen,
      debugLookupSource,
    },
    setTrialCookieHeader(trialId),
  );
};
