import test from "node:test";
import assert from "node:assert/strict";

import { createIssuanceDecisionRecord } from "../netlify/functions/lib/issuance-action.mjs";
import { getIssuanceRecordById } from "../netlify/functions/lib/issuance-record-store.mjs";

const createMemoryStore = () => {
  const records = new Map();

  return {
    async get(key, options = {}) {
      const value = records.get(key);
      if (!value) return null;
      return options.type === "json" ? structuredClone(value) : value;
    },
    async setJSON(key, value) {
      records.set(key, structuredClone(value));
    },
  };
};

const buildInput = (overrides = {}) => ({
  issuanceId: "iss_20260402_0101",
  caseId: "VP-SUPPORT-2026-0402-0101",
  handledAt: "2026-04-02T10:10:00.000Z",
  operatorName: "Alice Chen",
  licenseKey: "vp-abcd-efgh-ijkl",
  deviceId: "LL-8QW12ER45TYU",
  commercialRecordStatus: "ACTIVE",
  actionTaken: "ISSUED_FORMAL_TOKEN",
  whetherFormalTokenIssued: "YES",
  issuedTokenForDeviceId: "LL-8QW12ER45TYU",
  issuedAt: "2026-04-02T10:10:00.000Z",
  issuanceResult: "ISSUED",
  customerReplySent: "YES",
  notes: "Lookup completed first.",
  ...overrides,
});

test("createIssuanceDecisionRecord writes a confirmed issuance record", async () => {
  const store = createMemoryStore();

  const result = await createIssuanceDecisionRecord({
    store,
    input: buildInput(),
  });
  const loaded = await getIssuanceRecordById(store, "iss_20260402_0101");

  assert.equal(result.ok, true);
  assert.equal(result.record.licenseKey, "VP-ABCD-EFGH-IJKL");
  assert.deepEqual(loaded, result.record);
});

test("createIssuanceDecisionRecord rejects invalid input", async () => {
  const store = createMemoryStore();

  const result = await createIssuanceDecisionRecord({
    store,
    input: buildInput({
      issuanceId: "",
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "INVALID_ISSUANCE_RECORD");
});

test("createIssuanceDecisionRecord rejects duplicate issuance ids", async () => {
  const store = createMemoryStore();

  await createIssuanceDecisionRecord({
    store,
    input: buildInput(),
  });

  const result = await createIssuanceDecisionRecord({
    store,
    input: buildInput(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "ISSUANCE_RECORD_ALREADY_EXISTS");
});
