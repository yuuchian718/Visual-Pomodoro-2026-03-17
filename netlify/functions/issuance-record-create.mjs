import { createIssuanceDecisionRecord } from "./lib/issuance-action.mjs";
import {
  createIssuanceCaseIndex,
  getIssuanceCaseIndexByCaseId,
  getIssuanceCaseIndexStore,
  updateIssuanceCaseIndex,
} from "./lib/issuance-case-index-store.mjs";
import { getIssuanceRecordStore } from "./lib/issuance-record-store.mjs";
import { jsonResponse } from "./lib/license-ops.mjs";
import { summarizeIssuanceRecord } from "./lib/issuance-summary.mjs";
import {
  authorizeIssuanceOperator,
  parseIssuanceJsonBody,
} from "./lib/issuance-route-auth.mjs";

export const createIssuanceRecordHandler =
  ({
    storeFactory = getIssuanceRecordStore,
    caseIndexStoreFactory = getIssuanceCaseIndexStore,
  } = {}) =>
  async (request) => {
    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const parsed = await parseIssuanceJsonBody(request);
    if (!parsed.ok) {
      return parsed.response;
    }

    const auth = authorizeIssuanceOperator({
      request,
      input: parsed.input,
      allowBodySecret: true,
    });
    if (!auth.ok) {
      return auth.response;
    }

    const result = await createIssuanceDecisionRecord({
      store: storeFactory(),
      input: parsed.input,
    });

    if (!result.ok) {
      const statusCode =
        result.error === "ISSUANCE_RECORD_ALREADY_EXISTS" ? 409 : 400;

      return jsonResponse(statusCode, {
        ok: false,
        error: result.error,
      });
    }

    const caseIndexStore = caseIndexStoreFactory();
    const existingCaseIndex = await getIssuanceCaseIndexByCaseId(
      caseIndexStore,
      result.record.caseId,
    );

    if (!existingCaseIndex) {
      await createIssuanceCaseIndex(caseIndexStore, {
        caseId: result.record.caseId,
        issuanceIds: [result.record.issuanceId],
        createdAt: result.record.handledAt,
        updatedAt: result.record.handledAt,
      });
    } else if (!existingCaseIndex.issuanceIds.includes(result.record.issuanceId)) {
      await updateIssuanceCaseIndex(caseIndexStore, {
        ...existingCaseIndex,
        issuanceIds: [...existingCaseIndex.issuanceIds, result.record.issuanceId],
        updatedAt: result.record.handledAt,
      });
    }

    return jsonResponse(200, {
      ok: true,
      record: result.record,
      summary: summarizeIssuanceRecord(result.record),
    });
  };

export default createIssuanceRecordHandler();
