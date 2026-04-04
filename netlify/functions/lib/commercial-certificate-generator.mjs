import { randomUUID } from "node:crypto";
import { getLicenseByKey } from "./license-store.mjs";

const buildCommercialCertificateCandidate = () => {
  const compact = randomUUID().replace(/-/g, "").toUpperCase();

  return [
    "VP",
    compact.slice(0, 4),
    compact.slice(4, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
  ].join("-");
};

export const generateCommercialCertificate = async (store, { maxAttempts = 5 } = {}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const licenseKey = buildCommercialCertificateCandidate();
    const existing = await getLicenseByKey(store, licenseKey);

    if (!existing) {
      return licenseKey;
    }
  }

  throw new Error("Unable to generate unique commercial certificate");
};
