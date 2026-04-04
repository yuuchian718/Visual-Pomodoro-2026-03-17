import { getIssuanceRecordById, getIssuanceRecordStore } from "./lib/issuance-record-store.mjs";
import { jsonResponse } from "./lib/license-ops.mjs";
import { authorizeIssuanceOperator } from "./lib/issuance-route-auth.mjs";
import { summarizeIssuanceRecord } from "./lib/issuance-summary.mjs";

export const createIssuanceRecordLookupHandler =
  ({ storeFactory = getIssuanceRecordStore } = {}) =>
  async (request) => {
    if (request.method !== "GET") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = authorizeIssuanceOperator({ request });
    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const issuanceId = url.searchParams.get("issuanceId")?.trim() || "";

    if (!issuanceId) {
      return jsonResponse(400, { ok: false, error: "INVALID_REQUEST" });
    }

    const record = await getIssuanceRecordById(storeFactory(), issuanceId);

    if (!record) {
      return jsonResponse(404, { ok: false, error: "ISSUANCE_RECORD_NOT_FOUND" });
    }

    return jsonResponse(200, {
      ok: true,
      summary: summarizeIssuanceRecord(record),
    });
  };

export default createIssuanceRecordLookupHandler();
