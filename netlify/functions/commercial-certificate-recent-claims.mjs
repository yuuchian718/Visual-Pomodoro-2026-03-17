import {
  getCommercialCertificateClaimStore,
  getRecentCommercialCertificateClaims,
} from "./lib/commercial-certificate-claim-store.mjs";
import { authorizeOperatorRequest, jsonResponse } from "./lib/license-ops.mjs";

export const lookupRecentCommercialCertificateClaims = async ({
  store,
}) => {
  const claims = await getRecentCommercialCertificateClaims(store);

  return {
    statusCode: 200,
    body: {
      ok: true,
      claims,
    },
  };
};

export const createCommercialCertificateRecentClaimsHandler =
  ({ storeFactory = getCommercialCertificateClaimStore } = {}) =>
  async (request) => {
    if (request.method !== "GET") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = await authorizeOperatorRequest(request);
    if (!auth.ok) {
      return auth.response;
    }

    const result = await lookupRecentCommercialCertificateClaims({
      store: storeFactory(),
    });

    return jsonResponse(result.statusCode, result.body);
  };

export default createCommercialCertificateRecentClaimsHandler();
