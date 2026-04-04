import {
  getCommercialCertificateClaimStore,
  getCommercialCertificateClaimByToken,
  isValidClaimEmail,
  normalizeClaimEmail,
  normalizeClaimToken,
} from "./lib/commercial-certificate-claim-store.mjs";
import { issueCommercialCertificateFromClaim } from "./lib/commercial-certificate-claim-issuance.mjs";
import { getLicenseStore } from "./lib/license-store.mjs";
import { jsonResponse } from "./lib/license-ops.mjs";

const INTERNAL_ERROR_RESULT = {
  statusCode: 500,
  body: {
    ok: false,
    code: "INTERNAL_ERROR",
  },
};

const RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const isRequestLike = (value) =>
  value !== null &&
  typeof value === "object" &&
  typeof value.method === "string" &&
  typeof value.json === "function";

const toNetlifyResponse = (statusCode, body) => ({
  statusCode,
  headers: RESPONSE_HEADERS,
  body: JSON.stringify(body),
});

const normalizeHandlerResult = (result) => {
  if (
    result &&
    typeof result === "object" &&
    Number.isInteger(result.statusCode) &&
    result.body !== undefined
  ) {
    return result;
  }

  console.error("[commercial-certificate-claim] Invalid handler result:", result);

  return INTERNAL_ERROR_RESULT;
};

const parseClassicEventBody = (event) => {
  if (event?.body === null || event?.body === undefined || event.body === "") {
    return {};
  }

  if (typeof event.body === "string") {
    return JSON.parse(event.body);
  }

  if (typeof event.body === "object") {
    return event.body;
  }

  throw new Error("INVALID_REQUEST");
};

export const claimCommercialCertificate = async ({
  claimStore,
  licenseStore,
  claimToken,
  email,
  claimedAt = new Date().toISOString(),
}) => {
  const normalizedClaimToken = normalizeClaimToken(claimToken);
  const normalizedEmail = normalizeClaimEmail(email);

  if (!normalizedClaimToken) {
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

  const issuance = await issueCommercialCertificateFromClaim({
    claimStore,
    licenseStore,
    claimToken: normalizedClaimToken,
    email: normalizedEmail,
    nowIso: claimedAt,
  });

  if (!issuance.ok) {
    const statusCode =
      issuance.code === "CLAIM_ALREADY_ISSUED"
        ? 409
        : issuance.code === "LICENSE_WRITE_NOT_VISIBLE"
          ? 500
          : 404;

    return {
      statusCode,
      body: {
        ok: false,
        code: issuance.code,
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      ok: true,
      commercialCertificate: issuance.commercialCertificate,
      email: issuance.email,
    },
  };
};

export const createCommercialCertificateClaimHandler =
  ({
    claimStoreFactory = getCommercialCertificateClaimStore,
    licenseStoreFactory = getLicenseStore,
    claimCommercialCertificateFn = claimCommercialCertificate,
  } = {}) =>
  async (requestOrEvent) => {
    const requestMode = isRequestLike(requestOrEvent);
    const method = requestMode ? requestOrEvent.method : requestOrEvent?.httpMethod;
    const respond = (statusCode, body) =>
      requestMode ? jsonResponse(statusCode, body) : toNetlifyResponse(statusCode, body);

    if (method !== "POST") {
      return respond(405, {
        ok: false,
        code: "METHOD_NOT_ALLOWED",
      });
    }

    let body;
    try {
      body = requestMode
        ? await requestOrEvent.json()
        : parseClassicEventBody(requestOrEvent);
    } catch {
      return respond(400, {
        ok: false,
        code: "INVALID_REQUEST",
      });
    }

    let result;
    try {
      result = await claimCommercialCertificateFn({
        claimStore: claimStoreFactory(),
        licenseStore: licenseStoreFactory(),
        claimToken: body?.claimToken,
        email: body?.email,
      });
    } catch (error) {
      console.error(
        "[commercial-certificate-claim] Unhandled error message:",
        error instanceof Error ? error.message : error,
      );
      console.error(
        "[commercial-certificate-claim] Unhandled error stack:",
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof Error && "cause" in error && error.cause !== undefined) {
        console.error(
          "[commercial-certificate-claim] Unhandled error cause:",
          error.cause,
        );
      }
      result = INTERNAL_ERROR_RESULT;
    }

    const normalizedResult = normalizeHandlerResult(result);

    return respond(normalizedResult.statusCode, normalizedResult.body);
  };

export const handler = createCommercialCertificateClaimHandler();

export default handler;
