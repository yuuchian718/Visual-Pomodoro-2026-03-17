import test from "node:test";
import assert from "node:assert/strict";

import {
  createIssuanceRecordHandler,
} from "../netlify/functions/issuance-record-create.mjs";
import { getIssuanceCaseIndexByCaseId } from "../netlify/functions/lib/issuance-case-index-store.mjs";

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
  issuanceId: "iss_20260402_0201",
  caseId: "VP-SUPPORT-2026-0402-0201",
  handledAt: "2026-04-02T11:00:00.000Z",
  operatorName: "Alice Chen",
  licenseKey: "VP-ABCD-EFGH-IJKL",
  deviceId: "LL-8QW12ER45TYU",
  commercialRecordStatus: "ACTIVE",
  actionTaken: "ISSUED_FORMAL_TOKEN",
  whetherFormalTokenIssued: "YES",
  issuedTokenForDeviceId: "LL-8QW12ER45TYU",
  issuedAt: "2026-04-02T11:00:00.000Z",
  issuanceResult: "ISSUED",
  customerReplySent: "YES",
  notes: "Lookup completed first.",
  ...overrides,
});

test("issuance record route writes a record, returns summary, and creates case index when authorized", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordHandler({
    storeFactory: () => store,
    caseIndexStoreFactory: () => store,
  });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/issuance-record-create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "test-secret",
      },
      body: JSON.stringify(buildRecord()),
    }),
  );

  const body = await response.json();
  const caseIndex = await getIssuanceCaseIndexByCaseId(store, "VP-SUPPORT-2026-0402-0201");

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.record.issuanceId, "iss_20260402_0201");
  assert.equal(body.summary.issuanceId, "iss_20260402_0201");
  assert.equal(body.summary.whetherFormalTokenIssued, "YES");
  assert.equal(body.summary.issuedTokenForDeviceId, "LL-8QW12ER45TYU");
  assert.equal(body.summary.notes, undefined);
  assert.deepEqual(caseIndex?.issuanceIds, ["iss_20260402_0201"]);
});

test("issuance record route rejects requests with missing or invalid operator secret", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordHandler({ storeFactory: () => store });

  const missingSecretResponse = await handler(
    new Request("http://localhost/.netlify/functions/issuance-record-create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(buildRecord()),
    }),
  );
  const invalidSecretResponse = await handler(
    new Request("http://localhost/.netlify/functions/issuance-record-create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "wrong-secret",
      },
      body: JSON.stringify(buildRecord({ issuanceId: "iss_20260402_0202" })),
    }),
  );

  assert.equal(missingSecretResponse.status, 401);
  assert.equal((await missingSecretResponse.json()).error, "OPERATOR_SECRET_REQUIRED");
  assert.equal(invalidSecretResponse.status, 403);
  assert.equal((await invalidSecretResponse.json()).error, "OPERATOR_SECRET_INVALID");
});

test("issuance record route rejects malformed json", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/issuance-record-create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "test-secret",
      },
      body: "{",
    }),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_JSON_BODY");
});

test("issuance record route rejects duplicate issuance ids", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordHandler({
    storeFactory: () => store,
    caseIndexStoreFactory: () => store,
  });

  const request = () =>
    new Request("http://localhost/.netlify/functions/issuance-record-create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "test-secret",
      },
      body: JSON.stringify(buildRecord()),
    });

  const firstResponse = await handler(request());
  const secondResponse = await handler(request());

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 409);
  assert.equal((await secondResponse.json()).error, "ISSUANCE_RECORD_ALREADY_EXISTS");
});

test("issuance record route appends a second issuance id under the same case without duplicates", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordHandler({
    storeFactory: () => store,
    caseIndexStoreFactory: () => store,
  });

  const firstResponse = await handler(
    new Request("http://localhost/.netlify/functions/issuance-record-create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "test-secret",
      },
      body: JSON.stringify(buildRecord()),
    }),
  );

  const secondResponse = await handler(
    new Request("http://localhost/.netlify/functions/issuance-record-create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "test-secret",
      },
      body: JSON.stringify(
        buildRecord({
          issuanceId: "iss_20260402_0202",
          handledAt: "2026-04-02T11:05:00.000Z",
          issuedAt: "2026-04-02T11:05:00.000Z",
        }),
      ),
    }),
  );

  const caseIndex = await getIssuanceCaseIndexByCaseId(store, "VP-SUPPORT-2026-0402-0201");

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.deepEqual(caseIndex?.issuanceIds, ["iss_20260402_0201", "iss_20260402_0202"]);
});
