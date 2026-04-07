import { randomUUID } from "node:crypto";

import { getStoreWithLocalFallback, isProductionRuntime } from "./local-dev-store.mjs";
import { normalizeLicenseKey } from "./license-store.mjs";

const ISSUE_STATUS = new Set(["ISSUED"]);
const OPERATOR_STATUS = new Set(["PENDING", "IMPORTED"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_ID_PATTERN = /^[A-Z0-9_-]{6,}$/i;
const RECENT_PUBLIC_CERTIFICATE_ISSUES_KEY = "public-certificate-issue:recent";

const isIsoDateString = (value) =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const normalizePublicIssueEmail = (email) => String(email || "").trim().toLowerCase();
export const normalizePublicIssueName = (name) => String(name || "").trim();
export const normalizePublicIssueOrderId = (orderId) => String(orderId || "").trim();

export const isValidPublicIssueEmail = (email) =>
  EMAIL_PATTERN.test(normalizePublicIssueEmail(email));

export const isValidPublicIssueName = (name) => normalizePublicIssueName(name) !== "";
export const isValidPublicIssueOrderId = (orderId) =>
  ORDER_ID_PATTERN.test(normalizePublicIssueOrderId(orderId));

const normalizePublicIssueId = (issueId) => String(issueId || "").trim();

const parseStoredPublicCertificateIssueRecord = (record) => {
  if (!isPlainObject(record)) return null;

  const issueId = normalizePublicIssueId(record.issueId);
  const name = record.name == null ? null : normalizePublicIssueName(record.name);
  const orderId = record.orderId == null ? null : normalizePublicIssueOrderId(record.orderId);
  const email = normalizePublicIssueEmail(record.email);
  const issuedCommercialCertificate = normalizeLicenseKey(record.issuedCommercialCertificate);
  const issuedAt = String(record.issuedAt || "").trim();
  const issueStatus = String(record.issueStatus || "").trim().toUpperCase();
  const operatorStatus = String(record.operatorStatus || "PENDING").trim().toUpperCase();
  const importedAt = record.importedAt == null ? null : String(record.importedAt || "").trim();

  if (!issueId) {
    throw new Error("Public certificate issue record is missing issueId");
  }

  if (name !== null && !isValidPublicIssueName(name)) {
    throw new Error("Public certificate issue record has invalid name");
  }

  if (orderId !== null && !isValidPublicIssueOrderId(orderId)) {
    throw new Error("Public certificate issue record has invalid orderId");
  }

  if (!isValidPublicIssueEmail(email)) {
    throw new Error("Public certificate issue record has invalid email");
  }

  if (!issuedCommercialCertificate) {
    throw new Error("Public certificate issue record is missing issuedCommercialCertificate");
  }

  if (!isIsoDateString(issuedAt)) {
    throw new Error("Public certificate issue record has invalid issuedAt");
  }

  if (!ISSUE_STATUS.has(issueStatus)) {
    throw new Error("Public certificate issue record has invalid issueStatus");
  }

  if (!OPERATOR_STATUS.has(operatorStatus)) {
    throw new Error("Public certificate issue record has invalid operatorStatus");
  }

  if (importedAt !== null && !isIsoDateString(importedAt)) {
    throw new Error("Public certificate issue record has invalid importedAt");
  }

  return {
    issueId,
    name,
    orderId,
    email,
    issuedCommercialCertificate,
    issuedAt,
    issueStatus,
    operatorStatus,
    importedAt,
  };
};

const parseStoredPublicCertificateIssueEmailIndex = (record) => {
  if (!isPlainObject(record)) return null;

  const email = normalizePublicIssueEmail(record.email);
  const issueId = normalizePublicIssueId(record.issueId);

  if (!isValidPublicIssueEmail(email)) {
    throw new Error("Public certificate issue email index has invalid email");
  }

  if (!issueId) {
    throw new Error("Public certificate issue email index is missing issueId");
  }

  return {
    email,
    issueId,
  };
};

const parseStoredRecentPublicCertificateIssuesIndex = (record) => {
  if (!isPlainObject(record)) return null;

  const issueIds = Array.isArray(record.issueIds)
    ? record.issueIds.map((value) => normalizePublicIssueId(value)).filter(Boolean)
    : null;

  if (!issueIds) {
    throw new Error("Public certificate recent issues index has invalid issueIds");
  }

  return {
    issueIds: [...new Set(issueIds)],
  };
};

const getPublicCertificateIssueKey = (issueId) =>
  `public-certificate-issue:id:${normalizePublicIssueId(issueId)}`;

const getPublicCertificateIssueEmailIndexKey = (email) =>
  `public-certificate-issue:email:${normalizePublicIssueEmail(email)}`;

const savePublicCertificateIssueEmailIndex = async (store, record) => {
  const parsedRecord = parseStoredPublicCertificateIssueEmailIndex(record);
  await store.setJSON(
    getPublicCertificateIssueEmailIndexKey(parsedRecord.email),
    parsedRecord,
  );
  return parsedRecord;
};

const getPublicCertificateIssueEmailIndex = async (store, email) => {
  const stored = await store.get(getPublicCertificateIssueEmailIndexKey(email), { type: "json" });

  if (!stored) return null;
  return parseStoredPublicCertificateIssueEmailIndex(stored);
};

const getRecentPublicCertificateIssuesIndex = async (store) => {
  const stored = await store.get(RECENT_PUBLIC_CERTIFICATE_ISSUES_KEY, { type: "json" });

  if (!stored) return { issueIds: [] };
  return parseStoredRecentPublicCertificateIssuesIndex(stored);
};

const saveRecentPublicCertificateIssuesIndex = async (store, record) => {
  const parsedRecord = parseStoredRecentPublicCertificateIssuesIndex(record);
  await store.setJSON(RECENT_PUBLIC_CERTIFICATE_ISSUES_KEY, parsedRecord);
  return parsedRecord;
};

const upsertRecentPublicCertificateIssuesIndex = async (store, issueId) => {
  const normalizedIssueId = normalizePublicIssueId(issueId);

  if (!normalizedIssueId) {
    return null;
  }

  const existing = await getRecentPublicCertificateIssuesIndex(store);
  const nextIssueIds = [
    normalizedIssueId,
    ...existing.issueIds.filter((value) => value !== normalizedIssueId),
  ];

  return saveRecentPublicCertificateIssuesIndex(store, {
    issueIds: nextIssueIds,
  });
};

const summarizePublicCertificateIssue = (record) => ({
  issueId: record.issueId,
  name: record.name,
  orderId: record.orderId,
  email: record.email,
  issuedCommercialCertificate: record.issuedCommercialCertificate,
  issuedAt: record.issuedAt,
  issueStatus: record.issueStatus,
  operatorStatus: record.operatorStatus,
  importedAt: record.importedAt,
});

export const getPublicCertificateIssueStoreName = () =>
  process.env.KOTO_PUBLIC_CERTIFICATE_ISSUE_STORE_NAME ||
  (isProductionRuntime()
    ? "visual-pomodoro-public-certificate-issue-prod"
    : "visual-pomodoro-public-certificate-issue-testing");

// Public issuance records intentionally live beside the commercial license store so the
// same hosted runtime configuration can be reused across issue + activate flows.
export const getPublicCertificateIssueStore = () =>
  getStoreWithLocalFallback(getPublicCertificateIssueStoreName());

export const createPublicCertificateIssueRecord = async (store, record) => {
  const parsedRecord = parseStoredPublicCertificateIssueRecord({
    issueId: record?.issueId || `pub_issue_${randomUUID()}`,
    name: record?.name ?? null,
    orderId: record?.orderId ?? null,
    email: record?.email,
    issuedCommercialCertificate: record?.issuedCommercialCertificate,
    issuedAt: record?.issuedAt,
    issueStatus: record?.issueStatus || "ISSUED",
    operatorStatus: record?.operatorStatus || "PENDING",
    importedAt: record?.importedAt ?? null,
  });
  const existing = await getPublicCertificateIssueById(store, parsedRecord.issueId);

  if (existing) {
    throw new Error("Public certificate issue record already exists");
  }

  await store.setJSON(getPublicCertificateIssueKey(parsedRecord.issueId), parsedRecord);
  await savePublicCertificateIssueEmailIndex(store, {
    email: parsedRecord.email,
    issueId: parsedRecord.issueId,
  });
  await upsertRecentPublicCertificateIssuesIndex(store, parsedRecord.issueId);

  return parsedRecord;
};

export const updatePublicCertificateIssueRecord = async (store, record) => {
  const parsedRecord = parseStoredPublicCertificateIssueRecord(record);
  const existing = await getPublicCertificateIssueById(store, parsedRecord.issueId);

  if (!existing) {
    throw new Error("Public certificate issue record does not exist");
  }

  await store.setJSON(getPublicCertificateIssueKey(parsedRecord.issueId), parsedRecord);
  await savePublicCertificateIssueEmailIndex(store, {
    email: parsedRecord.email,
    issueId: parsedRecord.issueId,
  });
  await upsertRecentPublicCertificateIssuesIndex(store, parsedRecord.issueId);

  return parsedRecord;
};

export const getPublicCertificateIssueById = async (store, issueId) => {
  const stored = await store.get(getPublicCertificateIssueKey(issueId), { type: "json" });

  if (!stored) return null;
  return parseStoredPublicCertificateIssueRecord(stored);
};

export const getPublicCertificateIssueByEmail = async (store, email) => {
  const normalizedEmail = normalizePublicIssueEmail(email);

  if (!isValidPublicIssueEmail(normalizedEmail)) {
    return null;
  }

  const index = await getPublicCertificateIssueEmailIndex(store, normalizedEmail);

  if (!index?.issueId) {
    return null;
  }

  return getPublicCertificateIssueById(store, index.issueId);
};

export const getRecentPublicCertificateIssues = async (store) => {
  const index = await getRecentPublicCertificateIssuesIndex(store);

  if (!index.issueIds.length) {
    return [];
  }

  const issues = await Promise.all(
    index.issueIds.map((issueId) => getPublicCertificateIssueById(store, issueId)),
  );

  return issues
    .filter((record) => record !== null)
    .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt))
    .map(summarizePublicCertificateIssue);
};
