import test from "node:test";
import assert from "node:assert/strict";

import {
  createCommercialCertificateClaim,
} from "../netlify/functions/lib/commercial-certificate-claim-store.mjs";
import {
  createCommercialCertificateRecentClaimsHandler,
  lookupRecentCommercialCertificateClaims,
} from "../netlify/functions/commercial-certificate-recent-claims.mjs";

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
  claimedAt: "2026-04-03T09:00:00.000Z",
  claimStatus: "ISSUED",
  ...overrides,
});

test("recent claims route returns recent claims in claimedAt desc order when authorized", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  await createCommercialCertificateClaim(store, buildClaimRecord());
  await createCommercialCertificateClaim(
    store,
    buildClaimRecord({
      claimToken: "claim_vp_test_0002",
      email: "two@example.com",
      commercialCertificate: "VP-TEST-ACTIVE-ONE",
      claimedAt: "2026-04-03T10:00:00.000Z",
    }),
  );
  const handler = createCommercialCertificateRecentClaimsHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/commercial-certificate-recent-claims", {
      method: "GET",
      headers: {
        "x-license-operator-secret": "test-secret",
      },
    }),
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    ok: true,
    claims: [
      {
        email: "two@example.com",
        claimToken: "claim_vp_test_0002",
        commercialCertificate: "VP-TEST-ACTIVE-ONE",
        claimedAt: "2026-04-03T10:00:00.000Z",
        claimStatus: "ISSUED",
      },
      {
        email: "user@example.com",
        claimToken: "claim_vp_test_0001",
        commercialCertificate: "VP-TEST-ACTIVE-EMPTY",
        claimedAt: "2026-04-03T09:00:00.000Z",
        claimStatus: "ISSUED",
      },
    ],
  });
});

test("recent claims route rejects unauthorized requests", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createCommercialCertificateRecentClaimsHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/commercial-certificate-recent-claims", {
      method: "GET",
      headers: {
        "x-license-operator-secret": "wrong-secret",
      },
    }),
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "OPERATOR_SECRET_INVALID");
});

test("recent claims route returns empty array when no records exist", async () => {
  const store = createMemoryStore();

  const result = await lookupRecentCommercialCertificateClaims({
    store,
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    ok: true,
    claims: [],
  });
});
