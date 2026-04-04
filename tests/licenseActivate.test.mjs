import test from "node:test";
import assert from "node:assert/strict";

import {
  createLicense,
  getLicenseByKey,
} from "../netlify/functions/lib/license-store.mjs";
import { activateLicense } from "../netlify/functions/license-activate.mjs";

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
  activatedDevices: [],
  issuedAt: "2026-04-01T09:30:00.000Z",
  expiresAt: null,
  notes: null,
  metadata: { source: "test" },
  createdAt: "2026-04-01T09:30:00.000Z",
  updatedAt: "2026-04-01T09:30:00.000Z",
  ...overrides,
});

test("activateLicense returns not found when license record does not exist", async () => {
  const store = createMemoryStore();

  const result = await activateLicense({
    store,
    licenseKey: "VP-UNKNOWN-0000",
    deviceId: "LL-DEVICE000001",
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.error, "LICENSE_NOT_FOUND");
});

test("activateLicense rejects blocked license records", async () => {
  const store = createMemoryStore();
  await createLicense(store, buildRecord({ status: "BLOCKED" }));

  const result = await activateLicense({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000001",
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.error, "LICENSE_BLOCKED");
});

test("activateLicense rejects expired license records", async () => {
  const store = createMemoryStore();
  await createLicense(
    store,
    buildRecord({
      status: "EXPIRED",
      expiresAt: "2026-03-31T09:30:00.000Z",
    }),
  );

  const result = await activateLicense({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000001",
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.error, "LICENSE_EXPIRED");
});

test("activateLicense rejects invalid request payloads", async () => {
  const store = createMemoryStore();

  const result = await activateLicense({
    store,
    licenseKey: "",
    deviceId: "   ",
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.error, "INVALID_REQUEST");
});

test("activateLicense returns idempotent success for same device", async () => {
  const store = createMemoryStore();
  await createLicense(
    store,
    buildRecord({
      activatedDevices: [
        {
          deviceId: "LL-DEVICE000001",
          activatedAt: "2026-04-01T09:40:00.000Z",
          lastSeenAt: "2026-04-01T09:50:00.000Z",
        },
      ],
    }),
  );

  const result = await activateLicense({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000001",
    nowIso: "2026-04-01T10:00:00.000Z",
  });
  const updated = await getLicenseByKey(store, "VP-ABCD-EFGH-IJKL");

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.result, "ALREADY_ACTIVATED");
  assert.equal(updated.activatedDevices.length, 1);
  assert.equal(updated.activatedDevices[0].lastSeenAt, "2026-04-01T10:00:00.000Z");
});

test("activateLicense allows a third distinct device", async () => {
  const store = createMemoryStore();
  await createLicense(
    store,
    buildRecord({
      activatedDevices: [
        {
          deviceId: "LL-DEVICE000001",
          activatedAt: "2026-04-01T09:40:00.000Z",
          lastSeenAt: "2026-04-01T09:50:00.000Z",
        },
        {
          deviceId: "LL-DEVICE000002",
          activatedAt: "2026-04-01T09:41:00.000Z",
          lastSeenAt: "2026-04-01T09:51:00.000Z",
        },
      ],
    }),
  );

  const result = await activateLicense({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000003",
    nowIso: "2026-04-01T10:00:00.000Z",
  });
  const updated = await getLicenseByKey(store, "VP-ABCD-EFGH-IJKL");

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.result, "ACTIVATED");
  assert.equal(updated.activatedDevices.length, 3);
  assert.equal(updated.activatedDevices[2].deviceId, "LL-DEVICE000003");
});

test("activateLicense rejects a fourth distinct device without modifying the record", async () => {
  const store = createMemoryStore();
  await createLicense(
    store,
    buildRecord({
      activatedDevices: [
        {
          deviceId: "LL-DEVICE000001",
          activatedAt: "2026-04-01T09:40:00.000Z",
          lastSeenAt: "2026-04-01T09:50:00.000Z",
        },
        {
          deviceId: "LL-DEVICE000002",
          activatedAt: "2026-04-01T09:41:00.000Z",
          lastSeenAt: "2026-04-01T09:51:00.000Z",
        },
        {
          deviceId: "LL-DEVICE000003",
          activatedAt: "2026-04-01T09:42:00.000Z",
          lastSeenAt: "2026-04-01T09:52:00.000Z",
        },
      ],
    }),
  );

  const before = await getLicenseByKey(store, "VP-ABCD-EFGH-IJKL");
  const result = await activateLicense({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000004",
    nowIso: "2026-04-01T10:00:00.000Z",
  });
  const after = await getLicenseByKey(store, "VP-ABCD-EFGH-IJKL");

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.error, "DEVICE_LIMIT_REACHED");
  assert.deepEqual(after, before);
});
