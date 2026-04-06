import {
  getPublicCertificateIssueById,
  getPublicCertificateIssueStore,
  updatePublicCertificateIssueRecord,
} from "./lib/public-certificate-issue-store.mjs";
import { authorizeOperatorRequest, jsonResponse } from "./lib/license-ops.mjs";

export const markPublicCertificateIssueImported = async ({
  store,
  issueId,
  nowIso,
}) => {
  const normalizedIssueId = String(issueId || "").trim();

  if (!normalizedIssueId) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        code: "INVALID_REQUEST",
      },
    };
  }

  const issue = await getPublicCertificateIssueById(store, normalizedIssueId);

  if (!issue) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        code: "NOT_FOUND",
      },
    };
  }

  const updatedIssue = await updatePublicCertificateIssueRecord(store, {
    ...issue,
    operatorStatus: "IMPORTED",
    importedAt: issue.importedAt || nowIso,
  });

  return {
    statusCode: 200,
    body: {
      ok: true,
      issue: updatedIssue,
    },
  };
};

export const createPublicCertificateIssueMarkHandler =
  ({ storeFactory = getPublicCertificateIssueStore } = {}) =>
  async (request) => {
    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = await authorizeOperatorRequest(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = auth.body;

    const result = await markPublicCertificateIssueImported({
      store: storeFactory(),
      issueId: body?.issueId,
      nowIso: new Date().toISOString(),
    });

    return jsonResponse(result.statusCode, result.body);
  };

export default createPublicCertificateIssueMarkHandler();
