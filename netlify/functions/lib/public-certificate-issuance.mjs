import { randomUUID } from "node:crypto";

import { generateCommercialCertificate } from "./commercial-certificate-generator.mjs";
import { createLicense, getLicenseByKey, getLicenseStoreName } from "./license-store.mjs";
import {
  createPublicCertificateIssueRecord,
  getPublicCertificateIssueByEmail,
  getPublicCertificateIssueStoreName,
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
    const existingLicense = await getLicenseByKey(
      licenseStore,
      existingIssue.issuedCommercialCertificate,
    );

    console.info("[public-certificate-issuance] Reuse lookup", {
      context: process.env.CONTEXT || "unknown",
      licenseStoreName: getLicenseStoreName(),
      issueStoreName: getPublicCertificateIssueStoreName(),
      email: normalizedEmail,
      issueId: existingIssue.issueId,
      commercialCertificate: existingIssue.issuedCommercialCertificate,
      licenseVisible: existingLicense !== null,
    });

    if (!existingLicense) {
      await createLicense(
        licenseStore,
        buildPublicCommercialLicenseRecord({
          issueId: existingIssue.issueId,
          commercialCertificate: existingIssue.issuedCommercialCertificate,
          email: existingIssue.email,
          nowIso: existingIssue.issuedAt,
        }),
      );

      const storedLicense = await getLicenseByKey(
        licenseStore,
        existingIssue.issuedCommercialCertificate,
      );

      console.info("[public-certificate-issuance] Recreated missing license record for reused issue", {
        context: process.env.CONTEXT || "unknown",
        licenseStoreName: getLicenseStoreName(),
        issueStoreName: getPublicCertificateIssueStoreName(),
        email: existingIssue.email,
        issueId: existingIssue.issueId,
        commercialCertificate: existingIssue.issuedCommercialCertificate,
        licenseVisibleAfterRecreate: storedLicense !== null,
      });

      if (!storedLicense) {
        return {
          ok: false,
          code: "LICENSE_WRITE_NOT_VISIBLE",
        };
      }
    }

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

  console.info("[public-certificate-issuance] New issue write result", {
    context: process.env.CONTEXT || "unknown",
    licenseStoreName: getLicenseStoreName(),
    issueStoreName: getPublicCertificateIssueStoreName(),
    email: normalizedEmail,
    issueId,
    commercialCertificate,
    licenseVisibleAfterWrite: storedLicense !== null,
  });

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
