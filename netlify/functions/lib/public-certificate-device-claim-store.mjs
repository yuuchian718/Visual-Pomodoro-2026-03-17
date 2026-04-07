import { getStoreWithLocalFallback, isProductionRuntime } from "./local-dev-store.mjs";
import { normalizeLicenseKey } from "./license-store.mjs";
import {
  isValidPublicIssueEmail,
  isValidPublicIssueOrderId,
  normalizePublicIssueEmail,
  normalizePublicIssueName,
  normalizePublicIssueOrderId,
} from "./public-certificate-issue-store.mjs";

const DEVICE_ID_PATTERN = /^LL-[A-Z0-9]{12}$/;

const isIsoDateString = (value) =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const normalizePublicIssueDeviceId = (deviceId) =>
  String(deviceId || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

export const isValidPublicIssueDeviceId = (deviceId) =>
  DEVICE_ID_PATTERN.test(normalizePublicIssueDeviceId(deviceId));

const getPublicCertificateDeviceClaimKey = (deviceId) =>
  `public-certificate-device-claim:device:${normalizePublicIssueDeviceId(deviceId)}`;

const parseStoredPublicCertificateDeviceClaimRecord = (record) => {
  if (!isPlainObject(record)) return null;

  const deviceId = normalizePublicIssueDeviceId(record.deviceId);
  const issueId = String(record.issueId || "").trim();
  const name = normalizePublicIssueName(record.name);
  const orderId = record.orderId == null ? null : normalizePublicIssueOrderId(record.orderId);
  const email = normalizePublicIssueEmail(record.email);
  const issuedCommercialCertificate = normalizeLicenseKey(record.issuedCommercialCertificate);
  const issuedAt = String(record.issuedAt || "").trim();

  if (!isValidPublicIssueDeviceId(deviceId)) {
    throw new Error("Public certificate device claim record has invalid deviceId");
  }

  if (!issueId) {
    throw new Error("Public certificate device claim record is missing issueId");
  }

  if (!name) {
    throw new Error("Public certificate device claim record is missing name");
  }

  if (orderId !== null && !isValidPublicIssueOrderId(orderId)) {
    throw new Error("Public certificate device claim record has invalid orderId");
  }

  if (!isValidPublicIssueEmail(email)) {
    throw new Error("Public certificate device claim record has invalid email");
  }

  if (!issuedCommercialCertificate) {
    throw new Error("Public certificate device claim record is missing issuedCommercialCertificate");
  }

  if (!isIsoDateString(issuedAt)) {
    throw new Error("Public certificate device claim record has invalid issuedAt");
  }

  return {
    deviceId,
    issueId,
    name,
    orderId,
    email,
    issuedCommercialCertificate,
    issuedAt,
  };
};

export const getPublicCertificateDeviceClaimStoreName = () =>
  process.env.KOTO_PUBLIC_CERTIFICATE_DEVICE_CLAIM_STORE_NAME ||
  (isProductionRuntime()
    ? "visual-pomodoro-public-certificate-device-claim-prod"
    : "visual-pomodoro-public-certificate-device-claim-testing");

export const getPublicCertificateDeviceClaimStore = () =>
  getStoreWithLocalFallback(getPublicCertificateDeviceClaimStoreName());

export const getPublicCertificateDeviceClaimByDeviceId = async (store, deviceId) => {
  const normalizedDeviceId = normalizePublicIssueDeviceId(deviceId);

  if (!isValidPublicIssueDeviceId(normalizedDeviceId)) {
    return null;
  }

  const stored = await store.get(getPublicCertificateDeviceClaimKey(normalizedDeviceId), {
    type: "json",
  });

  if (!stored) return null;
  return parseStoredPublicCertificateDeviceClaimRecord(stored);
};

export const createPublicCertificateDeviceClaimRecord = async (store, record) => {
  const parsedRecord = parseStoredPublicCertificateDeviceClaimRecord(record);
  const existing = await getPublicCertificateDeviceClaimByDeviceId(store, parsedRecord.deviceId);

  if (existing) {
    throw new Error("Public certificate device claim record already exists");
  }

  await store.setJSON(
    getPublicCertificateDeviceClaimKey(parsedRecord.deviceId),
    parsedRecord,
  );

  return parsedRecord;
};
