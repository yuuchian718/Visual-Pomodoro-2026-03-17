import { getStoreWithLocalFallback, isProductionRuntime } from "./local-dev-store.mjs";

/**
 * @typedef {{
 *   deviceId: string,
 *   activatedAt: string,
 *   lastSeenAt: string
 * }} ActivatedDeviceRecord
 *
 * @typedef {{
 *   id: string,
 *   licenseKey: string,
 *   redemptionCode: string | null,
 *   status: "ACTIVE" | "BLOCKED" | "EXPIRED",
 *   plan: string,
 *   maxDevices: 3,
 *   activatedDevices: ActivatedDeviceRecord[],
 *   issuedAt: string,
 *   expiresAt: string | null,
 *   notes: string | null,
 *   metadata: Record<string, unknown> | null,
 *   createdAt: string,
 *   updatedAt: string
 * }} CommercialLicenseRecord
 */

const LICENSE_STATUS = new Set(["ACTIVE", "BLOCKED", "EXPIRED"]);

export const normalizeLicenseKey = (licenseKey) =>
  String(licenseKey || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

const isIsoDateString = (value) =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseActivatedDevice = (value) => {
  if (!isPlainObject(value)) return null;

  const deviceId = String(value.deviceId || "").trim();
  const activatedAt = String(value.activatedAt || "").trim();
  const lastSeenAt = String(value.lastSeenAt || "").trim();

  if (!deviceId || !isIsoDateString(activatedAt) || !isIsoDateString(lastSeenAt)) {
    return null;
  }

  return {
    deviceId,
    activatedAt,
    lastSeenAt,
  };
};

export const parseStoredLicenseRecord = (record) => {
  if (!isPlainObject(record)) return null;

  const id = String(record.id || "").trim();
  const licenseKey = normalizeLicenseKey(record.licenseKey);
  const redemptionCode =
    record.redemptionCode === null || record.redemptionCode === undefined
      ? null
      : String(record.redemptionCode).trim() || null;
  const status = String(record.status || "").trim().toUpperCase();
  const plan = String(record.plan || "").trim();
  const maxDevices = Number(record.maxDevices);
  const activatedDevices = Array.isArray(record.activatedDevices)
    ? record.activatedDevices.map(parseActivatedDevice)
    : null;
  const issuedAt = String(record.issuedAt || "").trim();
  const expiresAt =
    record.expiresAt === null || record.expiresAt === undefined
      ? null
      : String(record.expiresAt).trim() || null;
  const notes =
    record.notes === null || record.notes === undefined
      ? null
      : String(record.notes);
  const metadata =
    record.metadata === null || record.metadata === undefined
      ? null
      : isPlainObject(record.metadata)
        ? record.metadata
        : null;
  const createdAt = String(record.createdAt || "").trim();
  const updatedAt = String(record.updatedAt || "").trim();

  if (!id) {
    throw new Error("Commercial license record is missing id");
  }

  if (!licenseKey) {
    throw new Error("Commercial license record is missing licenseKey");
  }

  if (!LICENSE_STATUS.has(status)) {
    throw new Error("Commercial license record has invalid status");
  }

  if (!plan) {
    throw new Error("Commercial license record is missing plan");
  }

  if (maxDevices !== 3) {
    throw new Error("Commercial license record maxDevices must be 3");
  }

  if (!activatedDevices || activatedDevices.some((entry) => entry === null)) {
    throw new Error("Commercial license record has invalid activatedDevices");
  }

  if (!isIsoDateString(issuedAt)) {
    throw new Error("Commercial license record has invalid issuedAt");
  }

  if (expiresAt !== null && !isIsoDateString(expiresAt)) {
    throw new Error("Commercial license record has invalid expiresAt");
  }

  if (!isIsoDateString(createdAt) || !isIsoDateString(updatedAt)) {
    throw new Error("Commercial license record has invalid lifecycle timestamps");
  }

  return {
    id,
    licenseKey,
    redemptionCode,
    status,
    plan,
    maxDevices: 3,
    activatedDevices,
    issuedAt,
    expiresAt,
    notes,
    metadata,
    createdAt,
    updatedAt,
  };
};

export const getLicenseStoreName = () =>
  process.env.VISUAL_POMODORO_LICENSE_STORE_NAME ||
  (isProductionRuntime()
    ? "visual-pomodoro-license-prod"
    : "visual-pomodoro-license-testing");

// The formal token activation path and public certificate issuance path must read and
// write the same store backend; only the store name may be overridden per environment.
export const getLicenseStore = () => getStoreWithLocalFallback(getLicenseStoreName());

const getLicenseKeyRecordKey = (licenseKey) =>
  `license:key:${normalizeLicenseKey(licenseKey)}`;

export const saveLicense = async (store, record) => {
  const parsedRecord = parseStoredLicenseRecord(record);
  await store.setJSON(getLicenseKeyRecordKey(parsedRecord.licenseKey), parsedRecord);
  return parsedRecord;
};

export const createLicense = async (store, record) => {
  const parsedRecord = parseStoredLicenseRecord(record);
  const existing = await getLicenseByKey(store, parsedRecord.licenseKey);

  if (existing) {
    throw new Error("Commercial license record already exists");
  }

  return saveLicense(store, parsedRecord);
};

export const updateLicense = async (store, record) => {
  const parsedRecord = parseStoredLicenseRecord(record);
  const existing = await getLicenseByKey(store, parsedRecord.licenseKey);

  if (!existing) {
    throw new Error("Commercial license record not found");
  }

  return saveLicense(store, parsedRecord);
};

export const getLicenseByKey = async (store, licenseKey) => {
  const stored = await store.get(getLicenseKeyRecordKey(licenseKey), { type: "json" });

  if (!stored) return null;
  return parseStoredLicenseRecord(stored);
};
