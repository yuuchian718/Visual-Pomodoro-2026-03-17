import { getStoreWithLocalFallback } from "./local-dev-store.mjs";
import { normalizeLicenseKey } from "./license-store.mjs";

const CLAIM_STATUS = new Set(["ISSUED"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isIsoDateString = (value) =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const normalizeClaimToken = (claimToken) => String(claimToken || "").trim();

export const normalizeClaimEmail = (email) => String(email || "").trim().toLowerCase();

export const isValidClaimEmail = (email) => EMAIL_PATTERN.test(normalizeClaimEmail(email));

export const parseStoredCommercialCertificateClaimRecord = (record) => {
  if (!isPlainObject(record)) return null;

  const claimToken = normalizeClaimToken(record.claimToken);
  const email =
    record.email === null || record.email === undefined
      ? null
      : normalizeClaimEmail(record.email) || null;
  const commercialCertificate =
    record.commercialCertificate === null || record.commercialCertificate === undefined
      ? null
      : normalizeLicenseKey(record.commercialCertificate) || null;
  const claimedAt =
    record.claimedAt === null || record.claimedAt === undefined
      ? null
      : String(record.claimedAt).trim() || null;
  const claimStatus = String(record.claimStatus || "").trim().toUpperCase();
  const issuedCommercialCertificate =
    record.issuedCommercialCertificate === null || record.issuedCommercialCertificate === undefined
      ? null
      : normalizeLicenseKey(record.issuedCommercialCertificate) || null;
  const issuedAt =
    record.issuedAt === null || record.issuedAt === undefined
      ? null
      : String(record.issuedAt).trim() || null;

  if (!claimToken) {
    throw new Error("Commercial certificate claim record is missing claimToken");
  }

  if (!CLAIM_STATUS.has(claimStatus)) {
    throw new Error("Commercial certificate claim record has invalid claimStatus");
  }

  if (email !== null && !isValidClaimEmail(email)) {
    throw new Error("Commercial certificate claim record has invalid email");
  }

  if (claimedAt !== null && !isIsoDateString(claimedAt)) {
    throw new Error("Commercial certificate claim record has invalid claimedAt");
  }

  if (issuedAt !== null && !isIsoDateString(issuedAt)) {
    throw new Error("Commercial certificate claim record has invalid issuedAt");
  }

  return {
    claimToken,
    email,
    commercialCertificate,
    claimedAt,
    claimStatus,
    issuedCommercialCertificate,
    issuedAt,
  };
};

export const getCommercialCertificateClaimStoreName = () =>
  process.env.CONTEXT === "production"
    ? "visual-pomodoro-commercial-certificate-claim-prod"
    : "visual-pomodoro-commercial-certificate-claim-testing";

export const getCommercialCertificateClaimStore = () =>
  getStoreWithLocalFallback(getCommercialCertificateClaimStoreName());

const getCommercialCertificateClaimKey = (claimToken) =>
  `commercial-certificate-claim:token:${normalizeClaimToken(claimToken)}`;

const getCommercialCertificateClaimEmailIndexKey = (email) =>
  `commercial-certificate-claim:email:${normalizeClaimEmail(email)}`;

const COMMERCIAL_CERTIFICATE_RECENT_CLAIMS_INDEX_KEY =
  "commercial-certificate-claim:recent";

const parseStoredCommercialCertificateClaimEmailIndex = (record) => {
  if (!isPlainObject(record)) return null;

  const email = normalizeClaimEmail(record.email);
  const claimTokens = Array.isArray(record.claimTokens)
    ? record.claimTokens.map((value) => normalizeClaimToken(value)).filter(Boolean)
    : null;

  if (!email) {
    throw new Error("Commercial certificate claim email index is missing email");
  }

  if (!claimTokens) {
    throw new Error("Commercial certificate claim email index has invalid claimTokens");
  }

  return {
    email,
    claimTokens: [...new Set(claimTokens)],
  };
};

const parseStoredCommercialCertificateRecentClaimsIndex = (record) => {
  if (!isPlainObject(record)) return null;

  const claimTokens = Array.isArray(record.claimTokens)
    ? record.claimTokens.map((value) => normalizeClaimToken(value)).filter(Boolean)
    : null;

  if (!claimTokens) {
    throw new Error("Commercial certificate recent claims index has invalid claimTokens");
  }

  return {
    claimTokens: [...new Set(claimTokens)],
  };
};

const getCommercialCertificateClaimEmailIndex = async (store, email) => {
  const stored = await store.get(getCommercialCertificateClaimEmailIndexKey(email), { type: "json" });

  if (!stored) return null;
  return parseStoredCommercialCertificateClaimEmailIndex(stored);
};

const saveCommercialCertificateClaimEmailIndex = async (store, record) => {
  const parsedRecord = parseStoredCommercialCertificateClaimEmailIndex(record);
  await store.setJSON(
    getCommercialCertificateClaimEmailIndexKey(parsedRecord.email),
    parsedRecord,
  );
  return parsedRecord;
};

const getCommercialCertificateRecentClaimsIndex = async (store) => {
  const stored = await store.get(COMMERCIAL_CERTIFICATE_RECENT_CLAIMS_INDEX_KEY, { type: "json" });

  if (!stored) return { claimTokens: [] };
  return parseStoredCommercialCertificateRecentClaimsIndex(stored);
};

const saveCommercialCertificateRecentClaimsIndex = async (store, record) => {
  const parsedRecord = parseStoredCommercialCertificateRecentClaimsIndex(record);
  await store.setJSON(COMMERCIAL_CERTIFICATE_RECENT_CLAIMS_INDEX_KEY, parsedRecord);
  return parsedRecord;
};

const upsertCommercialCertificateClaimEmailIndex = async (store, email, claimToken) => {
  const normalizedEmail = normalizeClaimEmail(email);
  const normalizedClaimToken = normalizeClaimToken(claimToken);

  if (!normalizedEmail || !normalizedClaimToken) {
    return null;
  }

  const existing = await getCommercialCertificateClaimEmailIndex(store, normalizedEmail);
  const nextClaimTokens = existing?.claimTokens.includes(normalizedClaimToken)
    ? existing.claimTokens
    : [...(existing?.claimTokens || []), normalizedClaimToken];

  return saveCommercialCertificateClaimEmailIndex(store, {
    email: normalizedEmail,
    claimTokens: nextClaimTokens,
  });
};

const upsertCommercialCertificateRecentClaimsIndex = async (store, claimToken) => {
  const normalizedClaimToken = normalizeClaimToken(claimToken);

  if (!normalizedClaimToken) {
    return null;
  }

  const existing = await getCommercialCertificateRecentClaimsIndex(store);
  const nextClaimTokens = [
    normalizedClaimToken,
    ...existing.claimTokens.filter((value) => value !== normalizedClaimToken),
  ];

  return saveCommercialCertificateRecentClaimsIndex(store, {
    claimTokens: nextClaimTokens,
  });
};

const summarizeCommercialCertificateClaim = (record) => ({
  email: record.email,
  claimToken: record.claimToken,
  commercialCertificate:
    record.issuedCommercialCertificate || record.commercialCertificate,
  claimedAt: record.claimedAt,
  claimStatus: record.claimStatus,
});

export const saveCommercialCertificateClaim = async (store, record) => {
  const parsedRecord = parseStoredCommercialCertificateClaimRecord(record);
  await store.setJSON(
    getCommercialCertificateClaimKey(parsedRecord.claimToken),
    parsedRecord,
  );
  if (parsedRecord.email) {
    await upsertCommercialCertificateClaimEmailIndex(
      store,
      parsedRecord.email,
      parsedRecord.claimToken,
    );
  }
  if (parsedRecord.claimedAt) {
    await upsertCommercialCertificateRecentClaimsIndex(
      store,
      parsedRecord.claimToken,
    );
  }
  return parsedRecord;
};

export const createCommercialCertificateClaim = async (store, record) => {
  const parsedRecord = parseStoredCommercialCertificateClaimRecord(record);
  const existing = await getCommercialCertificateClaimByToken(store, parsedRecord.claimToken);

  if (existing) {
    throw new Error("Commercial certificate claim record already exists");
  }

  return saveCommercialCertificateClaim(store, parsedRecord);
};

export const updateCommercialCertificateClaim = async (store, record) => {
  const parsedRecord = parseStoredCommercialCertificateClaimRecord(record);
  const existing = await getCommercialCertificateClaimByToken(store, parsedRecord.claimToken);

  if (!existing) {
    throw new Error("Commercial certificate claim record not found");
  }

  return saveCommercialCertificateClaim(store, parsedRecord);
};

export const getCommercialCertificateClaimByToken = async (store, claimToken) => {
  const stored = await store.get(getCommercialCertificateClaimKey(claimToken), { type: "json" });

  if (!stored) return null;
  return parseStoredCommercialCertificateClaimRecord(stored);
};

export const getCommercialCertificateClaimsByEmail = async (store, email) => {
  const normalizedEmail = normalizeClaimEmail(email);

  if (!normalizedEmail || !isValidClaimEmail(normalizedEmail)) {
    return [];
  }

  const index = await getCommercialCertificateClaimEmailIndex(store, normalizedEmail);

  if (!index || index.claimTokens.length === 0) {
    return [];
  }

  const claims = await Promise.all(
    index.claimTokens.map((claimToken) => getCommercialCertificateClaimByToken(store, claimToken)),
  );

  return claims
    .filter((record) => record !== null && record.email === normalizedEmail)
    .map(summarizeCommercialCertificateClaim);
};

export const getRecentCommercialCertificateClaims = async (store) => {
  const index = await getCommercialCertificateRecentClaimsIndex(store);

  if (!index || index.claimTokens.length === 0) {
    return [];
  }

  const claims = await Promise.all(
    index.claimTokens.map((claimToken) => getCommercialCertificateClaimByToken(store, claimToken)),
  );

  return claims
    .filter((record) => record !== null && record.claimedAt !== null)
    .sort((a, b) => Date.parse(b.claimedAt) - Date.parse(a.claimedAt))
    .map(summarizeCommercialCertificateClaim);
};
