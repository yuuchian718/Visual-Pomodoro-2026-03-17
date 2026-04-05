import {
  getPublicCertificateIssueByEmail,
  getPublicCertificateIssueStore,
  getRecentPublicCertificateIssues,
  isValidPublicIssueEmail,
  normalizePublicIssueEmail,
} from "./lib/public-certificate-issue-store.mjs";
import { authorizeOperatorRequest, jsonResponse } from "./lib/license-ops.mjs";

export const lookupPublicCertificateIssues = async ({
  store,
  email,
}) => {
  const normalizedEmail = normalizePublicIssueEmail(email);

  if (!normalizedEmail) {
    const issues = await getRecentPublicCertificateIssues(store);

    return {
      statusCode: 200,
      body: {
        ok: true,
        issues,
      },
    };
  }

  if (!isValidPublicIssueEmail(normalizedEmail)) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        code: "INVALID_EMAIL",
      },
    };
  }

  const issue = await getPublicCertificateIssueByEmail(store, normalizedEmail);

  if (!issue) {
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
      issues: [issue],
    },
  };
};

export const createPublicCertificateIssuesHandler =
  ({ storeFactory = getPublicCertificateIssueStore } = {}) =>
  async (request) => {
    if (request.method !== "GET") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = await authorizeOperatorRequest(request);
    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const result = await lookupPublicCertificateIssues({
      store: storeFactory(),
      email: url.searchParams.get("email"),
    });

    return jsonResponse(result.statusCode, result.body);
  };

export default createPublicCertificateIssuesHandler();
