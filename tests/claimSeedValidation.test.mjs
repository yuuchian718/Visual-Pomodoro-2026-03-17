import test from "node:test";
import assert from "node:assert/strict";

import { getCommercialCertificateClaimByToken } from "../netlify/functions/lib/commercial-certificate-claim-store.mjs";
import {
  buildValidationClaimSeedRecords,
  createClaimSeedValidationHandler,
  seedValidationClaims,
} from "../netlify/functions/claim-seed-validation.mjs";

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

test("seedValidationClaims creates the expected local claim seed", async () => {
  const store = createMemoryStore();

  const result = await seedValidationClaims({
    store,
    nowIso: "2026-04-02T16:00:00.000Z",
  });

  const record = await getCommercialCertificateClaimByToken(store, "claim_vp_test_0001");

  assert.equal(result.created.length, 1);
  assert.equal(result.skipped.length, 0);
  assert.equal(result.total, 1);
  assert.equal(record?.claimToken, "claim_vp_test_0001");
  assert.equal(record?.commercialCertificate, "VP-TEST-ACTIVE-EMPTY");
  assert.equal(record?.email, null);
  assert.equal(record?.claimedAt, null);
});

test("buildValidationClaimSeedRecords includes explicitly requested dev claim tokens", async () => {
  const records = buildValidationClaimSeedRecords({
    claimTokens: ["claim_vp_test_0002", " claim_vp_test_fresh_01 ", ""],
  });

  assert.equal(records.length, 2);
  assert.deepEqual(
    records.map((record) => record.claimToken),
    ["claim_vp_test_0002", "claim_vp_test_fresh_01"],
  );
  assert.equal(records[0].commercialCertificate, "VP-TEST-ACTIVE-EMPTY");
  assert.equal(records[1].email, null);
});

test("seedValidationClaims is idempotent and does not duplicate existing claim seeds", async () => {
  const store = createMemoryStore();

  const first = await seedValidationClaims({
    store,
    nowIso: "2026-04-02T16:00:00.000Z",
  });
  const second = await seedValidationClaims({
    store,
    nowIso: "2026-04-02T16:05:00.000Z",
  });

  assert.equal(first.created.length, 1);
  assert.equal(second.created.length, 0);
  assert.equal(second.skipped.length, 1);
  assert.equal(second.total, 1);
});

test("claim seed validation route seeds claim records when authorized", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createClaimSeedValidationHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/claim-seed-validation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "test-secret",
      },
      body: "{}",
    }),
  );

  const body = await response.json();
  const record = await getCommercialCertificateClaimByToken(store, "claim_vp_test_0001");

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.created.length, 1);
  assert.equal(body.skipped.length, 0);
  assert.equal(body.total, 1);
  assert.equal(record?.commercialCertificate, "VP-TEST-ACTIVE-EMPTY");
});

test("claim seed validation route can seed an explicitly requested fresh token", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createClaimSeedValidationHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/claim-seed-validation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "test-secret",
      },
      body: JSON.stringify({
        claimToken: "claim_vp_test_0002",
      }),
    }),
  );

  const body = await response.json();
  const record = await getCommercialCertificateClaimByToken(store, "claim_vp_test_0002");

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.deepEqual(body.created, ["claim_vp_test_0002"]);
  assert.equal(record?.claimToken, "claim_vp_test_0002");
  assert.equal(record?.email, null);
  assert.equal(record?.claimedAt, null);
});

test("claim seed validation route rejects unauthorized requests", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createClaimSeedValidationHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/claim-seed-validation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-license-operator-secret": "wrong-secret",
      },
      body: "{}",
    }),
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "OPERATOR_SECRET_INVALID");
});
