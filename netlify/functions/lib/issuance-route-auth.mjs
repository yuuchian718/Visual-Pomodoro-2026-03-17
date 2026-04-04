import { getOperatorSecret, jsonResponse } from "./license-ops.mjs";

export const authorizeIssuanceOperator = ({ request, input = null, allowBodySecret = false }) => {
  const operatorSecret = getOperatorSecret();

  if (!operatorSecret) {
    return {
      ok: false,
      response: jsonResponse(500, { ok: false, error: "OPERATOR_SECRET_MISSING" }),
    };
  }

  const submittedSecret =
    request.headers.get("x-license-operator-secret")?.trim()
    || (allowBodySecret ? String(input?.secret || "").trim() : "");

  if (!submittedSecret) {
    return {
      ok: false,
      response: jsonResponse(401, { ok: false, error: "OPERATOR_SECRET_REQUIRED" }),
    };
  }

  if (submittedSecret !== operatorSecret) {
    return {
      ok: false,
      response: jsonResponse(403, { ok: false, error: "OPERATOR_SECRET_INVALID" }),
    };
  }

  return {
    ok: true,
  };
};

export const parseIssuanceJsonBody = async (request) => {
  try {
    return {
      ok: true,
      input: await request.json(),
    };
  } catch {
    return {
      ok: false,
      response: jsonResponse(400, { ok: false, error: "INVALID_JSON_BODY" }),
    };
  }
};
