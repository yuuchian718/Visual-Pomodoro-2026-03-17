import { randomUUID } from "node:crypto";

import { generateCommercialCertificate } from "./commercial-certificate-generator.mjs";
import { createLicense, getLicenseByKey } from "./license-store.mjs";
import {
  createPublicCertificateIssueRecord,
  getPublicCertificateIssueByEmail,
  isValidPublicIssueEmail,
  normalizePublicIssueEmail,
} from "./public-certificate-issue-store.mjs";

export const buildPublicCommercialLicenseRecord = ({
  issueId,
  commercialCertificate,
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
    email,
  },
  createdAt: nowIso,
  updatedAt: nowIso,
});

export const issueCommercialCertificateForPublicRequest = async ({
  issueStore,
  licenseStore,
  email,
  nowIso = new Date().toISOString(),
}) => {
  const normalizedEmail = normalizePublicIssueEmail(email);

  if (!isValidPublicIssueEmail(normalizedEmail)) {
    return {
      ok: false,
      code: "INVALID_EMAIL",
    };
  }

  const existingIssue = await getPublicCertificateIssueByEmail(issueStore, normalizedEmail);

  if (existingIssue) {
    return {
      ok: true,
      commercialCertificate: existingIssue.issuedCommercialCertificate,
      email: existingIssue.email,
      issuedAt: existingIssue.issuedAt,
      reused: true,
      issueId: existingIssue.issueId,
    };
  }

  const commercialCertificate = await generateCommercialCertificate(licenseStore);
  const issueId = `pub_issue_${randomUUID()}`;

  await createLicense(
    licenseStore,
    buildPublicCommercialLicenseRecord({
      issueId,
      commercialCertificate,
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
    email: normalizedEmail,
    issuedCommercialCertificate: commercialCertificate,
    issuedAt: nowIso,
    issueStatus: "ISSUED",
  });

  return {
    ok: true,
    commercialCertificate: issueRecord.issuedCommercialCertificate,
    email: issueRecord.email,
    issuedAt: issueRecord.issuedAt,
    reused: false,
    issueId: issueRecord.issueId,
  };
};
