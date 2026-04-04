import test from "node:test";
import assert from "node:assert/strict";

import {
  createCommercialCertificateClaim,
  getCommercialCertificateClaimByToken,
} from "../netlify/functions/lib/commercial-certificate-claim-store.mjs";
import { getLicenseByKey } from "../netlify/functions/lib/license-store.mjs";
import {
  claimCommercialCertificate,
  createCommercialCertificateClaimHandler,
} from "../netlify/functions/commercial-certificate-claim.mjs";
import {
  activateLicenseAndIssueFormalToken,
} from "../netlify/functions/license-activate-and-issue.mjs";

const TEST_PRIVATE_KEY_B64 = "u6n+4/4TLx6hgW6utED8nSv0epVkaN5JDSOZXVQP5cs=";

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
  email: null,
  claimedAt: null,
  claimStatus: "ISSUED",
  issuedCommercialCertificate: null,
  issuedAt: null,
  ...overrides,
});

test("valid claimToken + valid email creates real license record and returns new commercialCertificate", async () => {
  const claimStore = createMemoryStore();
  const licenseStore = createMemoryStore();
  await createCommercialCertificateClaim(claimStore, buildClaimRecord());

  const result = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "User@example.com",
    claimedAt: "2026-04-02T12:00:00.000Z",
  });

  const storedClaim = await getCommercialCertificateClaimByToken(
    claimStore,
    "claim_vp_test_0001",
  );
  const storedLicense = await getLicenseByKey(
    licenseStore,
    result.body.commercialCertificate,
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.email, "user@example.com");
  assert.match(result.body.commercialCertificate, /^VP-[A-Z0-9]+(?:-[A-Z0-9]+)+$/);
  assert.equal(storedClaim?.email, "user@example.com");
  assert.equal(storedClaim?.claimedAt, "2026-04-02T12:00:00.000Z");
  assert.equal(storedClaim?.issuedAt, "2026-04-02T12:00:00.000Z");
  assert.equal(
    storedClaim?.issuedCommercialCertificate,
    result.body.commercialCertificate,
  );
  assert.equal(storedLicense?.licenseKey, result.body.commercialCertificate);
  assert.equal(storedLicense?.status, "ACTIVE");
  assert.equal(storedLicense?.maxDevices, 3);
});

test("claim returns failure when created license is not immediately visible on readback", async () => {
  const claimStore = createMemoryStore();
  const licenseStore = {
    async get() {
      return null;
    },
    async setJSON() {},
  };
  await createCommercialCertificateClaim(claimStore, buildClaimRecord());

  const result = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "user@example.com",
    claimedAt: "2026-04-02T12:00:00.000Z",
  });

  const storedClaim = await getCommercialCertificateClaimByToken(
    claimStore,
    "claim_vp_test_0001",
  );

  assert.equal(result.statusCode, 500);
  assert.deepEqual(result.body, {
    ok: false,
    code: "LICENSE_WRITE_NOT_VISIBLE",
  });
  assert.equal(storedClaim?.issuedCommercialCertificate, null);
  assert.equal(storedClaim?.email, null);
});

test("same claimToken + same email returns same commercialCertificate without reissuing", async () => {
  const claimStore = createMemoryStore();
  const licenseStore = createMemoryStore();
  await createCommercialCertificateClaim(claimStore, buildClaimRecord());

  const first = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "user@example.com",
    claimedAt: "2026-04-02T12:00:00.000Z",
  });
  const second = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "USER@example.com",
    claimedAt: "2026-04-02T12:10:00.000Z",
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(
    second.body.commercialCertificate,
    first.body.commercialCertificate,
  );

  const storedClaim = await getCommercialCertificateClaimByToken(
    claimStore,
    "claim_vp_test_0001",
  );
  assert.equal(
    storedClaim?.issuedCommercialCertificate,
    first.body.commercialCertificate,
  );
  assert.equal(storedClaim?.email, "user@example.com");
});

test("same claimToken + different email is rejected", async () => {
  const claimStore = createMemoryStore();
  const licenseStore = createMemoryStore();
  await createCommercialCertificateClaim(claimStore, buildClaimRecord());

  const first = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "user@example.com",
    claimedAt: "2026-04-02T12:00:00.000Z",
  });
  const second = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "other@example.com",
    claimedAt: "2026-04-02T12:10:00.000Z",
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 409);
  assert.deepEqual(second.body, {
    ok: false,
    code: "CLAIM_ALREADY_ISSUED",
  });
});

test("returned commercialCertificate still works with existing activate-and-issue flow", async () => {
  const claimStore = createMemoryStore();
  const licenseStore = createMemoryStore();
  await createCommercialCertificateClaim(claimStore, buildClaimRecord());

  const claimResult = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "user@example.com",
    claimedAt: "2026-04-02T12:00:00.000Z",
  });

  const activationResult = await activateLicenseAndIssueFormalToken({
    store: licenseStore,
    licenseKey: claimResult.body.commercialCertificate,
    deviceId: "LL-TESTDEVICE01",
    privateKeyB64: TEST_PRIVATE_KEY_B64,
    nowIso: "2026-04-02T12:05:00.000Z",
  });

  assert.equal(claimResult.statusCode, 200);
  assert.equal(activationResult.statusCode, 200);
  assert.equal(activationResult.body.ok, true);
  assert.equal(activationResult.body.code, "FORMAL_TOKEN_ISSUED");
  assert.ok(activationResult.body.formalToken);
});

test("invalid claimToken returns NOT_FOUND", async () => {
  const claimStore = createMemoryStore();
  const licenseStore = createMemoryStore();

  const result = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_missing",
    email: "user@example.com",
  });

  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body, {
    ok: false,
    code: "NOT_FOUND",
  });
});

test("empty or invalid email returns INVALID_EMAIL", async () => {
  const claimStore = createMemoryStore();
  const licenseStore = createMemoryStore();
  await createCommercialCertificateClaim(claimStore, buildClaimRecord());

  const emptyEmailResult = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "",
  });
  const invalidEmailResult = await claimCommercialCertificate({
    claimStore,
    licenseStore,
    claimToken: "claim_vp_test_0001",
    email: "not-an-email",
  });

  assert.equal(emptyEmailResult.statusCode, 400);
  assert.deepEqual(emptyEmailResult.body, {
    ok: false,
    code: "INVALID_EMAIL",
  });
  assert.equal(invalidEmailResult.statusCode, 400);
  assert.deepEqual(invalidEmailResult.body, {
    ok: false,
    code: "INVALID_EMAIL",
  });
});

test("netlify-style handler returns classic lambda response shape", async () => {
  const handler = createCommercialCertificateClaimHandler({
    claimStoreFactory: () => createMemoryStore(),
    licenseStoreFactory: () => createMemoryStore(),
    claimCommercialCertificateFn: async () => ({
      statusCode: 200,
      body: {
        ok: true,
        commercialCertificate: "VP-TEST-CLASSIC-0001",
        email: "user@example.com",
      },
    }),
  });

  const response = await handler({
    httpMethod: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      claimToken: "claim_vp_test_0002",
      email: "user@example.com",
    }),
  });

  assert.equal(response.statusCode, 200);
  assert.equal(typeof response.body, "string");
  assert.deepEqual(JSON.parse(response.body), {
    ok: true,
    commercialCertificate: "VP-TEST-CLASSIC-0001",
    email: "user@example.com",
  });
});

test("handler returns INTERNAL_ERROR when downstream result is missing", async () => {
  const handler = createCommercialCertificateClaimHandler({
    claimStoreFactory: () => createMemoryStore(),
    licenseStoreFactory: () => createMemoryStore(),
    claimCommercialCertificateFn: async () => undefined,
  });

  const response = await handler({
    httpMethod: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      claimToken: "claim_vp_test_0002",
      email: "user@example.com",
    }),
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    code: "INTERNAL_ERROR",
  });
});
