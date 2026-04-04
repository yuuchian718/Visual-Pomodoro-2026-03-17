import test from "node:test";
import assert from "node:assert/strict";

import { createIssuanceRecord } from "../netlify/functions/lib/issuance-record-store.mjs";
import {
  createIssuanceRecordLookupHandler,
} from "../netlify/functions/issuance-record-lookup.mjs";

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
  issuanceId: "iss_20260402_0301",
  caseId: "VP-SUPPORT-2026-0402-0301",
  handledAt: "2026-04-02T12:00:00.000Z",
  operatorName: "Alice Chen",
  licenseKey: "VP-ABCD-EFGH-IJKL",
  deviceId: "LL-8QW12ER45TYU",
  commercialRecordStatus: "ACTIVE",
  actionTaken: "ISSUED_FORMAL_TOKEN",
  whetherFormalTokenIssued: "YES",
  issuedTokenForDeviceId: "LL-8QW12ER45TYU",
  issuedAt: "2026-04-02T12:00:00.000Z",
  issuanceResult: "ISSUED",
  customerReplySent: "YES",
  notes: "Lookup completed first.",
  ...overrides,
});

test("issuance lookup route returns a single issuance summary when authorized", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  await createIssuanceRecord(store, buildRecord());

  const handler = createIssuanceRecordLookupHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/issuance-record-lookup?issuanceId=iss_20260402_0301",
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
  assert.equal(body.summary.issuanceId, "iss_20260402_0301");
  assert.equal(body.summary.whetherFormalTokenIssued, "YES");
  assert.equal(body.summary.issuedTokenForDeviceId, "LL-8QW12ER45TYU");
  assert.equal(body.summary.notes, undefined);
});

test("issuance lookup route rejects missing issuanceId", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordLookupHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/issuance-record-lookup", {
      method: "GET",
      headers: {
        "x-license-operator-secret": "test-secret",
      },
    }),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_REQUEST");
});

test("issuance lookup route rejects when operator secret is missing", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "";
  const store = createMemoryStore();
  const handler = createIssuanceRecordLookupHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/issuance-record-lookup?issuanceId=iss_20260402_0301",
      {
        method: "GET",
      },
    ),
  );

  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, "OPERATOR_SECRET_MISSING");
});

test("issuance lookup route rejects when operator secret is invalid", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordLookupHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/issuance-record-lookup?issuanceId=iss_20260402_0301",
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

test("issuance lookup route rejects when record is not found", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createIssuanceRecordLookupHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/issuance-record-lookup?issuanceId=iss_20260402_9999",
      {
        method: "GET",
        headers: {
          "x-license-operator-secret": "test-secret",
        },
      },
    ),
  );

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "ISSUANCE_RECORD_NOT_FOUND");
});
