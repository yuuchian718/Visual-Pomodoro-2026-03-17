import test from "node:test";
import assert from "node:assert/strict";

import {
  createCommercialCertificateClaim,
  getCommercialCertificateClaimsByEmail,
} from "../netlify/functions/lib/commercial-certificate-claim-store.mjs";
import {
  createCommercialCertificateClaimsByEmailHandler,
  lookupCommercialCertificateClaimsByEmail,
} from "../netlify/functions/commercial-certificate-claims-by-email.mjs";

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

const buildClaimRecord = (overrides = {}) => ({
  claimToken: "claim_vp_test_0001",
  email: "user@example.com",
  commercialCertificate: "VP-TEST-ACTIVE-EMPTY",
  claimedAt: "2026-04-02T12:00:00.000Z",
  claimStatus: "ISSUED",
  ...overrides,
});

test("getCommercialCertificateClaimsByEmail returns minimal claim records for email", async () => {
  const store = createMemoryStore();
  await createCommercialCertificateClaim(store, buildClaimRecord());

  const claims = await getCommercialCertificateClaimsByEmail(store, "USER@example.com");

  assert.deepEqual(claims, [
    {
      email: "user@example.com",
      claimToken: "claim_vp_test_0001",
      commercialCertificate: "VP-TEST-ACTIVE-EMPTY",
      claimedAt: "2026-04-02T12:00:00.000Z",
      claimStatus: "ISSUED",
    },
  ]);
});

test("lookupCommercialCertificateClaimsByEmail returns NOT_FOUND when email has no records", async () => {
  const store = createMemoryStore();

  const result = await lookupCommercialCertificateClaimsByEmail({
    store,
    email: "missing@example.com",
  });

  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body, {
    ok: false,
    code: "NOT_FOUND",
  });
});

test("claims-by-email route returns minimal records when authorized", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  await createCommercialCertificateClaim(store, buildClaimRecord());
  const handler = createCommercialCertificateClaimsByEmailHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/commercial-certificate-claims-by-email?email=user@example.com",
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
  assert.deepEqual(body, {
    ok: true,
    email: "user@example.com",
    claims: [
      {
        email: "user@example.com",
        claimToken: "claim_vp_test_0001",
        commercialCertificate: "VP-TEST-ACTIVE-EMPTY",
        claimedAt: "2026-04-02T12:00:00.000Z",
        claimStatus: "ISSUED",
      },
    ],
  });
});

test("claims-by-email route rejects unauthorized requests", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createCommercialCertificateClaimsByEmailHandler({ storeFactory: () => store });

  const response = await handler(
    new Request(
      "http://localhost/.netlify/functions/commercial-certificate-claims-by-email?email=user@example.com",
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
