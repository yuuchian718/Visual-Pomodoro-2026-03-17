import {
  createIssuanceRecord,
  parseStoredIssuanceRecord,
} from "./issuance-record-store.mjs";

export const createIssuanceDecisionRecord = async ({ store, input }) => {
  try {
    const parsedInput = parseStoredIssuanceRecord(input);

    const record = await createIssuanceRecord(store, parsedInput);

    return {
      ok: true,
      record,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Issuance record already exists") {
      return {
        ok: false,
        error: "ISSUANCE_RECORD_ALREADY_EXISTS",
      };
    }

    return {
      ok: false,
      error: "INVALID_ISSUANCE_RECORD",
    };
  }
};
