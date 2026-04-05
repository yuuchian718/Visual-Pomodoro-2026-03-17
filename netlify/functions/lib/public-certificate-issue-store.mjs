import { randomUUID } from "node:crypto";

import { getStoreWithLocalFallback, isProductionRuntime } from "./local-dev-store.mjs";
import { normalizeLicenseKey } from "./license-store.mjs";

const ISSUE_STATUS = new Set(["ISSUED"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECENT_PUBLIC_CERTIFICATE_ISSUES_KEY = "public-certificate-issue:recent";

const isIsoDateString = (value) =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const normalizePublicIssueEmail = (email) => String(email || "").trim().toLowerCase();

export const isValidPublicIssueEmail = (email) =>
  EMAIL_PATTERN.test(normalizePublicIssueEmail(email));

const normalizePublicIssueId = (issueId) => String(issueId || "").trim();

const parseStoredPublicCertificateIssueRecord = (record) => {
  if (!isPlainObject(record)) return null;

  const issueId = normalizePublicIssueId(record.issueId);
  const email = normalizePublicIssueEmail(record.email);
  const issuedCommercialCertificate = normalizeLicenseKey(record.issuedCommercialCertificate);
  const issuedAt = String(record.issuedAt || "").trim();
  const issueStatus = String(record.issueStatus || "").trim().toUpperCase();

  if (!issueId) {
    throw new Error("Public certificate issue record is missing issueId");
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

  return {
    issueId,
    email,
    issuedCommercialCertificate,
    issuedAt,
    issueStatus,
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
  email: record.email,
  issuedCommercialCertificate: record.issuedCommercialCertificate,
  issuedAt: record.issuedAt,
  issueStatus: record.issueStatus,
});

export const getPublicCertificateIssueStoreName = () =>
  process.env.KOTO_PUBLIC_CERTIFICATE_ISSUE_STORE_NAME ||
  (isProductionRuntime()
    ? "visual-pomodoro-public-certificate-issue-prod"
    : "visual-pomodoro-public-certificate-issue-testing");

export const getPublicCertificateIssueStore = () =>
  getStoreWithLocalFallback(getPublicCertificateIssueStoreName());

export const createPublicCertificateIssueRecord = async (store, record) => {
  const parsedRecord = parseStoredPublicCertificateIssueRecord({
    issueId: record?.issueId || `pub_issue_${randomUUID()}`,
    email: record?.email,
    issuedCommercialCertificate: record?.issuedCommercialCertificate,
    issuedAt: record?.issuedAt,
    issueStatus: record?.issueStatus || "ISSUED",
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
