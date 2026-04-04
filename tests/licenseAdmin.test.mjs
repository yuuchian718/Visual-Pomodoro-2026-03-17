import test from "node:test";
import assert from "node:assert/strict";

import {
  createLicense,
  getLicenseByKey,
} from "../netlify/functions/lib/license-store.mjs";
import { blockLicense } from "../netlify/functions/license-block.mjs";
import { unblockLicense } from "../netlify/functions/license-unblock.mjs";
import { resetLicenseDevices } from "../netlify/functions/license-reset-devices.mjs";
import { lookupLicense } from "../netlify/functions/license-lookup.mjs";
import { authorizeOperatorRequest } from "../netlify/functions/lib/license-ops.mjs";

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
  id: "lic_test_001",
  licenseKey: "VP-ABCD-EFGH-IJKL",
  redemptionCode: null,
  status: "ACTIVE",
  plan: "LIFETIME",
  maxDevices: 3,
  activatedDevices: [
    {
      deviceId: "LL-DEVICE000001",
      activatedAt: "2026-04-01T09:40:00.000Z",
      lastSeenAt: "2026-04-01T09:50:00.000Z",
    },
  ],
  issuedAt: "2026-04-01T09:30:00.000Z",
  expiresAt: null,
  notes: null,
  metadata: { source: "test" },
  createdAt: "2026-04-01T09:30:00.000Z",
  updatedAt: "2026-04-01T09:30:00.000Z",
  ...overrides,
});

test("lookupLicense returns minimal summary for an existing record", async () => {
  const store = createMemoryStore();
  await createLicense(store, buildRecord());

  const result = await lookupLicense({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.license.status, "ACTIVE");
  assert.equal(result.body.license.maxDevices, 3);
  assert.equal(result.body.license.activatedDevices.length, 1);
});

test("lookupLicense returns not found for missing license records", async () => {
  const store = createMemoryStore();

  const result = await lookupLicense({
    store,
    licenseKey: "VP-UNKNOWN-0000",
  });

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.error, "LICENSE_NOT_FOUND");
});

test("blockLicense sets status to BLOCKED and updates timestamps", async () => {
  const store = createMemoryStore();
  await createLicense(store, buildRecord());

  const result = await blockLicense({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    reason: "support block",
    nowIso: "2026-04-01T10:00:00.000Z",
  });
  const updated = await getLicenseByKey(store, "VP-ABCD-EFGH-IJKL");

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.record.status, "BLOCKED");
  assert.equal(updated.status, "BLOCKED");
  assert.equal(updated.updatedAt, "2026-04-01T10:00:00.000Z");
  assert.match(updated.notes ?? "", /support block/);
});

test("unblockLicense sets BLOCKED record back to ACTIVE", async () => {
  const store = createMemoryStore();
  await createLicense(
    store,
    buildRecord({
      status: "BLOCKED",
      notes: "old note",
    }),
  );

  const result = await unblockLicense({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    reason: "support unblock",
    nowIso: "2026-04-01T10:00:00.000Z",
  });
  const updated = await getLicenseByKey(store, "VP-ABCD-EFGH-IJKL");

  assert.equal(result.statusCode, 200);
  assert.equal(updated.status, "ACTIVE");
  assert.equal(updated.updatedAt, "2026-04-01T10:00:00.000Z");
  assert.match(updated.notes ?? "", /support unblock/);
});

test("resetLicenseDevices clears activatedDevices without deleting the license", async () => {
  const store = createMemoryStore();
  await createLicense(store, buildRecord());

  const result = await resetLicenseDevices({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    reason: "device reset",
    nowIso: "2026-04-01T10:00:00.000Z",
  });
  const updated = await getLicenseByKey(store, "VP-ABCD-EFGH-IJKL");

  assert.equal(result.statusCode, 200);
  assert.equal(updated.activatedDevices.length, 0);
  assert.equal(updated.updatedAt, "2026-04-01T10:00:00.000Z");
  assert.match(updated.notes ?? "", /device reset/);
});

test("blockLicense returns not found when the license record does not exist", async () => {
  const store = createMemoryStore();

  const result = await blockLicense({
    store,
    licenseKey: "VP-UNKNOWN-0000",
    reason: "support block",
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.error, "LICENSE_NOT_FOUND");
});

test("authorizeOperatorRequest returns invalid json error for malformed POST bodies", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";

  const request = new Request("http://localhost/.netlify/functions/license-block", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: "{",
  });

  const result = await authorizeOperatorRequest(request);
  const responseBody = await result.response.json();

  assert.equal(result.ok, false);
  assert.equal(responseBody.error, "INVALID_JSON_BODY");
});

test("authorizeOperatorRequest preserves POST json body when operator secret is provided via header", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";

  const request = new Request("http://localhost/.netlify/functions/license-reset-devices", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-license-operator-secret": "test-secret",
    },
    body: JSON.stringify({
      licenseKey: "VP-ABCD-EFGH-IJKL",
      reason: "device reset",
    }),
  });

  const result = await authorizeOperatorRequest(request);

  assert.equal(result.ok, true);
  assert.deepEqual(result.body, {
    licenseKey: "VP-ABCD-EFGH-IJKL",
    reason: "device reset",
  });
});
