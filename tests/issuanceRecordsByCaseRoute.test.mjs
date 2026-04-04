import test from "node:test";
import assert from "node:assert/strict";

import { createIssuanceCaseIndex } from "../netlify/functions/lib/issuance-case-index-store.mjs";
import {
  createIssuanceRecordsByCaseHandler,
} from "../netlify/functions/issuance-records-by-case.mjs";

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

const buildCaseIndex = (overrides = {}) => ({
  caseId: "VP-SUPPORT-2026-0402-0201",
  issuanceIds: ["iss_20260402_0201", "iss_20260402_0202"],
  createdAt: "2026-04-02T11:00:00.000Z",
  updatedAt: "2026-04-02T11:05:00.000Z",
  ...overrides,
});

test("issuance records by case route returns issuance ids when authorized", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  await createIssuanceCaseIndex(store, buildCaseIndex());
  const handler = createIssuanceRecordsByCaseHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/issuance-records-by-case?caseId=VP-SUPPORT-2026-0402-0201",
      {
        method: "GET",
        headers: {
          "x-license-operator-secret": "test-secret",
        },
      },
    ),
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.caseId, "VP-SUPPORT-2026-0402-0201");
  assert.deepEqual(body.issuanceIds, ["iss_20260402_0201", "iss_20260402_0202"]);
});

test("issuance records by case route rejects missing caseId", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordsByCaseHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/issuance-records-by-case", {
      method: "GET",
      headers: {
        "x-license-operator-secret": "test-secret",
      },
    }),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_REQUEST");
});

test("issuance records by case route rejects when operator secret is missing", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "";
  const store = createMemoryStore();
  const handler = createIssuanceRecordsByCaseHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/issuance-records-by-case?caseId=VP-SUPPORT-2026-0402-0201",
      {
        method: "GET",
      },
    ),
  );

  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, "OPERATOR_SECRET_MISSING");
});

test("issuance records by case route rejects when operator secret is invalid", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordsByCaseHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/issuance-records-by-case?caseId=VP-SUPPORT-2026-0402-0201",
      {
        method: "GET",
        headers: {
          "x-license-operator-secret": "wrong-secret",
        },
      },
    ),
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "OPERATOR_SECRET_INVALID");
});

test("issuance records by case route rejects when case index is not found", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordsByCaseHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/issuance-records-by-case?caseId=VP-SUPPORT-2026-0402-9999",
      {
        method: "GET",
        headers: {
          "x-license-operator-secret": "test-secret",
        },
      },
    ),
  );

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "ISSUANCE_CASE_INDEX_NOT_FOUND");
});
