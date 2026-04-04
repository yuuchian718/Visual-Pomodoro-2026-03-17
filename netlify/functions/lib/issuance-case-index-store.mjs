import { getStore } from "@netlify/blobs";

const isIsoDateString = (value) =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const parseStoredIssuanceCaseIndexRecord = (record) => {
  if (!isPlainObject(record)) return null;

  const caseId = String(record.caseId || "").trim();
  const issuanceIds = Array.isArray(record.issuanceIds)
    ? record.issuanceIds.map((value) => String(value || "").trim())
    : null;
  const createdAt = String(record.createdAt || "").trim();
  const updatedAt = String(record.updatedAt || "").trim();

  if (!caseId) {
    throw new Error("Issuance case index record is missing caseId");
  }

  if (!issuanceIds || issuanceIds.some((value) => value === "")) {
    throw new Error("Issuance case index record has invalid issuanceIds");
  }

  if (!isIsoDateString(createdAt) || !isIsoDateString(updatedAt)) {
    throw new Error("Issuance case index record has invalid lifecycle timestamps");
  }

  return {
    caseId,
    issuanceIds,
    createdAt,
    updatedAt,
  };
};

export const getIssuanceCaseIndexStoreName = () =>
  process.env.CONTEXT === "production"
    ? "visual-pomodoro-issuance-case-index-prod"
    : "visual-pomodoro-issuance-case-index-testing";

export const getIssuanceCaseIndexStore = () => getStore(getIssuanceCaseIndexStoreName());

const getIssuanceCaseIndexKey = (caseId) => `issuance:case:${String(caseId || "").trim()}`;

export const saveIssuanceCaseIndex = async (store, record) => {
  const parsedRecord = parseStoredIssuanceCaseIndexRecord(record);
  await store.setJSON(getIssuanceCaseIndexKey(parsedRecord.caseId), parsedRecord);
  return parsedRecord;
};

export const createIssuanceCaseIndex = async (store, record) => {
  const parsedRecord = parseStoredIssuanceCaseIndexRecord(record);
  const existing = await getIssuanceCaseIndexByCaseId(store, parsedRecord.caseId);

  if (existing) {
    throw new Error("Issuance case index record already exists");
  }

  return saveIssuanceCaseIndex(store, parsedRecord);
};

export const updateIssuanceCaseIndex = async (store, record) => {
  const parsedRecord = parseStoredIssuanceCaseIndexRecord(record);
  const existing = await getIssuanceCaseIndexByCaseId(store, parsedRecord.caseId);

  if (!existing) {
    throw new Error("Issuance case index record not found");
  }

  return saveIssuanceCaseIndex(store, parsedRecord);
};

export const getIssuanceCaseIndexByCaseId = async (store, caseId) => {
  const stored = await store.get(getIssuanceCaseIndexKey(caseId), { type: "json" });

  if (!stored) return null;
  return parseStoredIssuanceCaseIndexRecord(stored);
};
