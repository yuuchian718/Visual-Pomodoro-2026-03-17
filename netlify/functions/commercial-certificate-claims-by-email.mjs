import {
  getCommercialCertificateClaimStore,
  getCommercialCertificateClaimsByEmail,
  isValidClaimEmail,
  normalizeClaimEmail,
} from "./lib/commercial-certificate-claim-store.mjs";
import { authorizeOperatorRequest, jsonResponse } from "./lib/license-ops.mjs";

export const lookupCommercialCertificateClaimsByEmail = async ({
  store,
  email,
}) => {
  const normalizedEmail = normalizeClaimEmail(email);

  if (!normalizedEmail) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        code: "INVALID_REQUEST",
      },
    };
  }

  if (!isValidClaimEmail(normalizedEmail)) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        code: "INVALID_EMAIL",
      },
    };
  }

  const claims = await getCommercialCertificateClaimsByEmail(store, normalizedEmail);

  if (claims.length === 0) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        code: "NOT_FOUND",
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      ok: true,
      email: normalizedEmail,
      claims,
    },
  };
};

export const createCommercialCertificateClaimsByEmailHandler =
  ({ storeFactory = getCommercialCertificateClaimStore } = {}) =>
  async (request) => {
    if (request.method !== "GET") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = await authorizeOperatorRequest(request);
    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const result = await lookupCommercialCertificateClaimsByEmail({
      store: storeFactory(),
      email: url.searchParams.get("email"),
    });

    return jsonResponse(result.statusCode, result.body);
  };

export default createCommercialCertificateClaimsByEmailHandler();
