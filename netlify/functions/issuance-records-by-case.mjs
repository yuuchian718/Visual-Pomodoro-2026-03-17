import {
  getIssuanceCaseIndexByCaseId,
  getIssuanceCaseIndexStore,
} from "./lib/issuance-case-index-store.mjs";
import { jsonResponse } from "./lib/license-ops.mjs";
import { authorizeIssuanceOperator } from "./lib/issuance-route-auth.mjs";

export const createIssuanceRecordsByCaseHandler =
  ({ storeFactory = getIssuanceCaseIndexStore } = {}) =>
  async (request) => {
    if (request.method !== "GET") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = authorizeIssuanceOperator({ request });
    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const caseId = url.searchParams.get("caseId")?.trim() || "";

    if (!caseId) {
      return jsonResponse(400, { ok: false, error: "INVALID_REQUEST" });
    }

    const caseIndex = await getIssuanceCaseIndexByCaseId(storeFactory(), caseId);

    if (!caseIndex) {
      return jsonResponse(404, { ok: false, error: "ISSUANCE_CASE_INDEX_NOT_FOUND" });
    }

    return jsonResponse(200, {
      ok: true,
      caseId: caseIndex.caseId,
      issuanceIds: caseIndex.issuanceIds,
    });
  };

export default createIssuanceRecordsByCaseHandler();
