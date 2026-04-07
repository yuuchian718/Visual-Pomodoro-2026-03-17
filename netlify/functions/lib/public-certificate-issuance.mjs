import { randomUUID } from "node:crypto";

import { generateCommercialCertificate } from "./commercial-certificate-generator.mjs";
import { createLicense, getLicenseByKey, getLicenseStoreName, saveLicense } from "./license-store.mjs";
import {
  createPublicCertificateDeviceClaimRecord,
  getPublicCertificateDeviceClaimByDeviceId,
  getPublicCertificateDeviceClaimStoreName,
  isValidPublicIssueDeviceId,
  normalizePublicIssueDeviceId,
} from "./public-certificate-device-claim-store.mjs";
import {
  createPublicCertificateIssueRecord,
  getPublicCertificateIssueByEmail,
  getPublicCertificateIssueStoreName,
  isValidPublicIssueEmail,
  isValidPublicIssueOrderId,
  normalizePublicIssueEmail,
} from "./public-certificate-issue-store.mjs";

export const buildPublicCommercialLicenseRecord = ({
  issueId,
  commercialCertificate,
  name,
  orderId,
  email,
  nowIso,
}) => ({
  id: `lic_public_${randomUUID()}`,
  licenseKey: commercialCertificate,
  redemptionCode: null,
  status: "ACTIVE",
  plan: "COMMERCIAL_PUBLIC_ISSUE",
  maxDevices: 3,
  activatedDevices: [],
  issuedAt: nowIso,
  expiresAt: null,
  notes: "Issued via public certificate issue",
  metadata: {
    source: "public-certificate-issue",
    publicIssue: true,
    issueId,
    name,
    orderId,
    email,
  },
  createdAt: nowIso,
  updatedAt: nowIso,
});

export const issueCommercialCertificateForPublicRequest = async ({
  issueStore,
  deviceClaimStore,
  licenseStore,
  deviceId,
  name,
  orderId,
  email,
  nowIso = new Date().toISOString(),
}) => {
  const normalizedDeviceId = normalizePublicIssueDeviceId(deviceId);
  const normalizedName = String(name || "").trim();
  const normalizedOrderId = String(orderId || "").trim();
  const normalizedEmail = normalizePublicIssueEmail(email);

  if (
    !normalizedName ||
    !isValidPublicIssueOrderId(normalizedOrderId) ||
    !isValidPublicIssueEmail(normalizedEmail) ||
    !isValidPublicIssueDeviceId(normalizedDeviceId)
  ) {
    return {
      ok: false,
      code: !normalizedName
        ? "INVALID_NAME"
        : !isValidPublicIssueOrderId(normalizedOrderId)
          ? "INVALID_ORDER_ID"
        : !isValidPublicIssueEmail(normalizedEmail)
          ? "INVALID_EMAIL"
          : "INVALID_DEVICE_ID",
    };
  }

  const existingIssue = await getPublicCertificateIssueByEmail(issueStore, normalizedEmail);

  if (existingIssue) {
    const existingDeviceClaim = await getPublicCertificateDeviceClaimByDeviceId(
      deviceClaimStore,
      normalizedDeviceId,
    );
    const existingLicense = await getLicenseByKey(
      licenseStore,
      existingIssue.issuedCommercialCertificate,
    );

    if (!existingLicense) {
      await saveLicense(
        licenseStore,
        buildPublicCommercialLicenseRecord({
          issueId: existingIssue.issueId,
          commercialCertificate: existingIssue.issuedCommercialCertificate,
          name: existingIssue.name,
          orderId: existingIssue.orderId,
          email: existingIssue.email,
          nowIso: existingIssue.issuedAt,
        }),
      );

      const storedLicense = await getLicenseByKey(
        licenseStore,
        existingIssue.issuedCommercialCertificate,
      );

      if (!storedLicense) {
        return {
          ok: false,
          code: "LICENSE_WRITE_NOT_VISIBLE",
        };
      }
    }

    if (!existingDeviceClaim) {
      await createPublicCertificateDeviceClaimRecord(deviceClaimStore, {
        deviceId: normalizedDeviceId,
        issueId: existingIssue.issueId,
        name: existingIssue.name || normalizedName,
        orderId: existingIssue.orderId || normalizedOrderId,
        email: existingIssue.email,
        issuedCommercialCertificate: existingIssue.issuedCommercialCertificate,
        issuedAt: existingIssue.issuedAt,
      });
    }

    return {
      ok: true,
      commercialCertificate: existingIssue.issuedCommercialCertificate,
      name: existingIssue.name,
      email: existingIssue.email,
      issuedAt: existingIssue.issuedAt,
      reused: true,
      issueId: existingIssue.issueId,
    };
  }

  const existingDeviceClaim = await getPublicCertificateDeviceClaimByDeviceId(
    deviceClaimStore,
    normalizedDeviceId,
  );

  if (existingDeviceClaim) {
    const existingLicense = await getLicenseByKey(
      licenseStore,
      existingDeviceClaim.issuedCommercialCertificate,
    );

    if (!existingLicense) {
      await saveLicense(
        licenseStore,
        buildPublicCommercialLicenseRecord({
          issueId: existingDeviceClaim.issueId,
          commercialCertificate: existingDeviceClaim.issuedCommercialCertificate,
          name: existingDeviceClaim.name,
          orderId: existingDeviceClaim.orderId,
          email: existingDeviceClaim.email,
          nowIso: existingDeviceClaim.issuedAt,
        }),
      );

      const storedLicense = await getLicenseByKey(
        licenseStore,
        existingDeviceClaim.issuedCommercialCertificate,
      );

      if (!storedLicense) {
        return {
          ok: false,
          code: "LICENSE_WRITE_NOT_VISIBLE",
        };
      }
    }

    return {
      ok: true,
      commercialCertificate: existingDeviceClaim.issuedCommercialCertificate,
      name: existingDeviceClaim.name,
      email: existingDeviceClaim.email,
      issuedAt: existingDeviceClaim.issuedAt,
      reused: true,
      issueId: existingDeviceClaim.issueId,
    };
  }

  const commercialCertificate = await generateCommercialCertificate(licenseStore);
  const issueId = `pub_issue_${randomUUID()}`;

  await createLicense(
    licenseStore,
      buildPublicCommercialLicenseRecord({
        issueId,
        commercialCertificate,
        name: normalizedName,
        orderId: normalizedOrderId,
        email: normalizedEmail,
        nowIso,
      }),
  );

  const storedLicense = await getLicenseByKey(licenseStore, commercialCertificate);

  if (!storedLicense) {
    return {
      ok: false,
      code: "LICENSE_WRITE_NOT_VISIBLE",
    };
  }

  const issueRecord = await createPublicCertificateIssueRecord(issueStore, {
    issueId,
    name: normalizedName,
    orderId: normalizedOrderId,
    email: normalizedEmail,
    issuedCommercialCertificate: commercialCertificate,
    issuedAt: nowIso,
    issueStatus: "ISSUED",
  });

  await createPublicCertificateDeviceClaimRecord(deviceClaimStore, {
    deviceId: normalizedDeviceId,
    issueId: issueRecord.issueId,
    name: issueRecord.name,
    orderId: issueRecord.orderId,
    email: issueRecord.email,
    issuedCommercialCertificate: issueRecord.issuedCommercialCertificate,
    issuedAt: issueRecord.issuedAt,
  });

  return {
    ok: true,
    commercialCertificate: issueRecord.issuedCommercialCertificate,
    name: issueRecord.name,
    email: issueRecord.email,
    issuedAt: issueRecord.issuedAt,
    reused: false,
    issueId: issueRecord.issueId,
  };
};
