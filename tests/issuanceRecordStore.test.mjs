import test from "node:test";
import assert from "node:assert/strict";

import {
  createIssuanceRecord,
  getIssuanceRecordById,
  updateIssuanceRecord,
} from "../netlify/functions/lib/issuance-record-store.mjs";

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

const buildRecord = (overrides = {}) => ({
  issuanceId: "iss_20260402_0001",
  caseId: "VP-SUPPORT-2026-0402-0001",
  handledAt: "2026-04-02T09:10:00.000Z",
  operatorName: "Alice Chen",
  licenseKey: "vp-abcd-efgh-ijkl",
  deviceId: "LL-8QW12ER45TYU",
  commercialRecordStatus: "ACTIVE",
  actionTaken: "ISSUED_FORMAL_TOKEN",
  whetherFormalTokenIssued: "YES",
  issuedTokenForDeviceId: "LL-8QW12ER45TYU",
  issuedAt: "2026-04-02T09:10:00.000Z",
  issuanceResult: "ISSUED",
  customerReplySent: "YES",
  notes: "Lookup completed first.",
  ...overrides,
});

test("createIssuanceRecord stores and loads a normalized issuance record", async () => {
  const store = createMemoryStore();
  const record = buildRecord();

  const created = await createIssuanceRecord(store, record);
  const loaded = await getIssuanceRecordById(store, record.issuanceId);

  assert.equal(created.licenseKey, "VP-ABCD-EFGH-IJKL");
  assert.deepEqual(loaded, created);
});

test("updateIssuanceRecord rewrites an existing issuance record by issuance id", async () => {
  const store = createMemoryStore();
  const record = await createIssuanceRecord(store, buildRecord());

  const updated = await updateIssuanceRecord(store, {
    ...record,
    customerReplySent: "NO",
    notes: "Customer reply pending.",
    issuanceResult: "WAITING_FOR_REVIEW",
    updatedAt: undefined,
  });

  const loaded = await getIssuanceRecordById(store, record.issuanceId);

  assert.equal(updated.customerReplySent, "NO");
  assert.equal(updated.issuanceResult, "WAITING_FOR_REVIEW");
  assert.equal(loaded.notes, "Customer reply pending.");
});

test("createIssuanceRecord rejects malformed non-issued records", async () => {
  const store = createMemoryStore();

  await assert.rejects(
    () =>
      createIssuanceRecord(
        store,
        buildRecord({
          whetherFormalTokenIssued: "NO",
          issuedTokenForDeviceId: "LL-8QW12ER45TYU",
          issuedAt: null,
        }),
      ),
    /issuedTokenForDeviceId must be null/,
  );
});
