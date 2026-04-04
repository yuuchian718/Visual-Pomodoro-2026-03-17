import { randomUUID } from "node:crypto";
import {
  getCommercialCertificateClaimByToken,
  normalizeClaimEmail,
  normalizeClaimToken,
  updateCommercialCertificateClaim,
} from "./commercial-certificate-claim-store.mjs";
import { generateCommercialCertificate } from "./commercial-certificate-generator.mjs";
import { createLicense, getLicenseByKey } from "./license-store.mjs";

const buildCommercialLicenseRecord = ({
  claimToken,
  commercialCertificate,
  email,
  nowIso,
}) => ({
  id: `lic_claim_${randomUUID()}`,
  licenseKey: commercialCertificate,
  redemptionCode: null,
  status: "ACTIVE",
  plan: "COMMERCIAL_CLAIM",
  maxDevices: 3,
  activatedDevices: [],
  issuedAt: nowIso,
  expiresAt: null,
  notes: "Issued via commercial certificate claim",
  metadata: {
    source: "commercial-certificate-claim",
    claimToken,
    email,
  },
  createdAt: nowIso,
  updatedAt: nowIso,
});

export const issueCommercialCertificateFromClaim = async ({
  claimStore,
  licenseStore,
  claimToken,
  email,
  nowIso = new Date().toISOString(),
}) => {
  const normalizedClaimToken = normalizeClaimToken(claimToken);
  const normalizedEmail = normalizeClaimEmail(email);
  const existingClaim = await getCommercialCertificateClaimByToken(
    claimStore,
    normalizedClaimToken,
  );

  if (!existingClaim) {
    return {
      ok: false,
      code: "NOT_FOUND",
    };
  }

  if (existingClaim.issuedCommercialCertificate) {
    if (existingClaim.email === normalizedEmail) {
      return {
        ok: true,
        commercialCertificate: existingClaim.issuedCommercialCertificate,
        email: existingClaim.email,
      };
    }

    return {
      ok: false,
      code: "CLAIM_ALREADY_ISSUED",
    };
  }

  const commercialCertificate = await generateCommercialCertificate(licenseStore);

  await createLicense(
    licenseStore,
    buildCommercialLicenseRecord({
      claimToken: normalizedClaimToken,
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

  const updatedClaim = await updateCommercialCertificateClaim(claimStore, {
    ...existingClaim,
    email: normalizedEmail,
    claimedAt: nowIso,
    claimStatus: "ISSUED",
    issuedCommercialCertificate: commercialCertificate,
    issuedAt: nowIso,
  });

  return {
    ok: true,
    commercialCertificate: updatedClaim.issuedCommercialCertificate,
    email: updatedClaim.email,
  };
};
