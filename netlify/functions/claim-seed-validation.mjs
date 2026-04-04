import {
  createCommercialCertificateClaim,
  getCommercialCertificateClaimByToken,
  getCommercialCertificateClaimStore,
  normalizeClaimToken,
} from "./lib/commercial-certificate-claim-store.mjs";
import { authorizeOperatorRequest, jsonResponse } from "./lib/license-ops.mjs";

const DEFAULT_VALIDATION_CLAIM_TOKENS = ["claim_vp_test_0001"];

const normalizeRequestedClaimTokens = (value) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return [...new Set(values.map((item) => normalizeClaimToken(item)).filter(Boolean))];
};

export const buildValidationClaimSeedRecords = ({ claimTokens } = {}) => {
  const normalizedClaimTokens = normalizeRequestedClaimTokens(claimTokens);
  const tokens =
    normalizedClaimTokens.length > 0
      ? normalizedClaimTokens
      : DEFAULT_VALIDATION_CLAIM_TOKENS;

  return tokens.map((claimToken) => ({
    claimToken,
    email: null,
    commercialCertificate: "VP-TEST-ACTIVE-EMPTY",
    claimedAt: null,
    claimStatus: "ISSUED",
  }));
};

export const seedValidationClaims = async ({ store, claimTokens }) => {
  const records = buildValidationClaimSeedRecords({ claimTokens });
  const created = [];
  const skipped = [];

  for (const record of records) {
    const existing = await getCommercialCertificateClaimByToken(store, record.claimToken);

    if (existing) {
      skipped.push(record.claimToken);
      continue;
    }

    await createCommercialCertificateClaim(store, record);
    created.push(record.claimToken);
  }

  return {
    created,
    skipped,
    total: records.length,
  };
};

export const createClaimSeedValidationHandler =
  ({ storeFactory = getCommercialCertificateClaimStore } = {}) =>
  async (request) => {
    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = await authorizeOperatorRequest(request);

    if (!auth.ok) {
      return auth.response;
    }

    const result = await seedValidationClaims({
      store: storeFactory(),
      claimTokens: auth.body?.claimTokens || auth.body?.claimToken,
    });

    return jsonResponse(200, {
      ok: true,
      ...result,
    });
  };

export default createClaimSeedValidationHandler();
