import test from "node:test";
import assert from "node:assert/strict";

import {
  createIssuanceCaseIndex,
  getIssuanceCaseIndexByCaseId,
  updateIssuanceCaseIndex,
} from "../netlify/functions/lib/issuance-case-index-store.mjs";

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
  caseId: "VP-SUPPORT-2026-0402-0501",
  issuanceIds: ["iss_20260402_0501"],
  createdAt: "2026-04-02T14:00:00.000Z",
  updatedAt: "2026-04-02T14:00:00.000Z",
  ...overrides,
});

test("createIssuanceCaseIndex stores and loads a case index record", async () => {
  const store = createMemoryStore();

  const created = await createIssuanceCaseIndex(store, buildRecord());
  const loaded = await getIssuanceCaseIndexByCaseId(store, "VP-SUPPORT-2026-0402-0501");

  assert.deepEqual(loaded, created);
});

test("updateIssuanceCaseIndex rewrites an existing case index record", async () => {
  const store = createMemoryStore();
  await createIssuanceCaseIndex(store, buildRecord());

  const updated = await updateIssuanceCaseIndex(
    store,
    buildRecord({
      issuanceIds: ["iss_20260402_0501", "iss_20260402_0502"],
      updatedAt: "2026-04-02T14:10:00.000Z",
    }),
  );

  assert.equal(updated.issuanceIds.length, 2);
  assert.equal(updated.updatedAt, "2026-04-02T14:10:00.000Z");
});

test("createIssuanceCaseIndex rejects malformed case index records", async () => {
  const store = createMemoryStore();

  await assert.rejects(
    () =>
      createIssuanceCaseIndex(
        store,
        buildRecord({
          issuanceIds: [""],
        }),
      ),
    /invalid issuanceIds/,
  );
});
