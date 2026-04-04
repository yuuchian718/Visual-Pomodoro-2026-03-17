import { getStore } from "@netlify/blobs";

/**
 * @typedef {{
 *   issuanceId: string,
 *   caseId: string,
 *   handledAt: string,
 *   operatorName: string,
 *   licenseKey: string,
 *   deviceId: string,
 *   commercialRecordStatus: "ACTIVE" | "BLOCKED" | "EXPIRED",
 *   actionTaken: string,
 *   whetherFormalTokenIssued: "YES" | "NO",
 *   issuedTokenForDeviceId: string | null,
 *   issuedAt: string | null,
 *   issuanceResult: string,
 *   customerReplySent: "YES" | "NO",
 *   notes: string | null,
 * }} IssuanceRecord
 */

const COMMERCIAL_RECORD_STATUS = new Set(["ACTIVE", "BLOCKED", "EXPIRED"]);
const YES_NO = new Set(["YES", "NO"]);

export const normalizeLicenseKey = (licenseKey) =>
  String(licenseKey || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

export const normalizeDeviceId = (deviceId) =>
  String(deviceId || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

const normalizeYesNo = (value) => String(value || "").trim().toUpperCase();

const isIsoDateString = (value) =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const parseStoredIssuanceRecord = (record) => {
  if (!isPlainObject(record)) return null;

  const issuanceId = String(record.issuanceId || "").trim();
  const caseId = String(record.caseId || "").trim();
  const handledAt = String(record.handledAt || "").trim();
  const operatorName = String(record.operatorName || "").trim();
  const licenseKey = normalizeLicenseKey(record.licenseKey);
  const deviceId = normalizeDeviceId(record.deviceId);
  const commercialRecordStatus = String(record.commercialRecordStatus || "").trim().toUpperCase();
  const actionTaken = String(record.actionTaken || "").trim();
  const whetherFormalTokenIssued = normalizeYesNo(record.whetherFormalTokenIssued);
  const issuedTokenForDeviceId =
    record.issuedTokenForDeviceId === null || record.issuedTokenForDeviceId === undefined
      ? null
      : normalizeDeviceId(record.issuedTokenForDeviceId);
  const issuedAt =
    record.issuedAt === null || record.issuedAt === undefined
      ? null
      : String(record.issuedAt).trim() || null;
  const issuanceResult = String(record.issuanceResult || "").trim();
  const customerReplySent = normalizeYesNo(record.customerReplySent);
  const notes =
    record.notes === null || record.notes === undefined ? null : String(record.notes);

  if (!issuanceId) {
    throw new Error("Issuance record is missing issuanceId");
  }

  if (!caseId) {
    throw new Error("Issuance record is missing caseId");
  }

  if (!isIsoDateString(handledAt)) {
    throw new Error("Issuance record has invalid handledAt");
  }

  if (!operatorName) {
    throw new Error("Issuance record is missing operatorName");
  }

  if (!licenseKey) {
    throw new Error("Issuance record is missing licenseKey");
  }

  if (!deviceId) {
    throw new Error("Issuance record is missing deviceId");
  }

  if (!COMMERCIAL_RECORD_STATUS.has(commercialRecordStatus)) {
    throw new Error("Issuance record has invalid commercialRecordStatus");
  }

  if (!actionTaken) {
    throw new Error("Issuance record is missing actionTaken");
  }

  if (!YES_NO.has(whetherFormalTokenIssued)) {
    throw new Error("Issuance record has invalid whetherFormalTokenIssued");
  }

  if (!issuanceResult) {
    throw new Error("Issuance record is missing issuanceResult");
  }

  if (!YES_NO.has(customerReplySent)) {
    throw new Error("Issuance record has invalid customerReplySent");
  }

  if (whetherFormalTokenIssued === "YES") {
    if (!issuedTokenForDeviceId) {
      throw new Error("Issuance record issuedTokenForDeviceId is required when token is issued");
    }

    if (!isIsoDateString(issuedAt)) {
      throw new Error("Issuance record issuedAt is required when token is issued");
    }
  }

  if (whetherFormalTokenIssued === "NO") {
    if (issuedTokenForDeviceId !== null) {
      throw new Error("Issuance record issuedTokenForDeviceId must be null when no token is issued");
    }

    if (issuedAt !== null) {
      throw new Error("Issuance record issuedAt must be null when no token is issued");
    }
  }

  return {
    issuanceId,
    caseId,
    handledAt,
    operatorName,
    licenseKey,
    deviceId,
    commercialRecordStatus,
    actionTaken,
    whetherFormalTokenIssued,
    issuedTokenForDeviceId,
    issuedAt,
    issuanceResult,
    customerReplySent,
    notes,
  };
};

export const getIssuanceRecordStoreName = () =>
  process.env.CONTEXT === "production"
    ? "visual-pomodoro-issuance-prod"
    : "visual-pomodoro-issuance-testing";

export const getIssuanceRecordStore = () => getStore(getIssuanceRecordStoreName());

const getIssuanceRecordKey = (issuanceId) => `issuance:id:${String(issuanceId || "").trim()}`;

export const saveIssuanceRecord = async (store, record) => {
  const parsedRecord = parseStoredIssuanceRecord(record);
  await store.setJSON(getIssuanceRecordKey(parsedRecord.issuanceId), parsedRecord);
  return parsedRecord;
};

export const createIssuanceRecord = async (store, record) => {
  const parsedRecord = parseStoredIssuanceRecord(record);
  const existing = await getIssuanceRecordById(store, parsedRecord.issuanceId);

  if (existing) {
    throw new Error("Issuance record already exists");
  }

  return saveIssuanceRecord(store, parsedRecord);
};

export const updateIssuanceRecord = async (store, record) => {
  const parsedRecord = parseStoredIssuanceRecord(record);
  const existing = await getIssuanceRecordById(store, parsedRecord.issuanceId);

  if (!existing) {
    throw new Error("Issuance record not found");
  }

  return saveIssuanceRecord(store, parsedRecord);
};

export const getIssuanceRecordById = async (store, issuanceId) => {
  const stored = await store.get(getIssuanceRecordKey(issuanceId), { type: "json" });

  if (!stored) return null;
  return parseStoredIssuanceRecord(stored);
};
