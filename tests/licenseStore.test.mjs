import test from "node:test";
import assert from "node:assert/strict";

import {
  createLicense,
  getLicenseByKey,
  normalizeLicenseKey,
  updateLicense,
} from "../netlify/functions/lib/license-store.mjs";

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
  licenseKey: "vp-abcd-efgh-ijkl",
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

test("createLicense stores a normalized commercial license record", async () => {
  const store = createMemoryStore();
  const record = buildRecord();

  const created = await createLicense(store, record);
  const loaded = await getLicenseByKey(store, "VP-ABCD-EFGH-IJKL");

  assert.equal(created.licenseKey, "VP-ABCD-EFGH-IJKL");
  assert.deepEqual(loaded, created);
});

test("updateLicense rewrites an existing record by normalized license key", async () => {
  const store = createMemoryStore();
  const record = await createLicense(store, buildRecord());

  const updated = await updateLicense(store, {
    ...record,
    status: "BLOCKED",
    notes: "manual support block",
    updatedAt: "2026-04-02T09:30:00.000Z",
  });

  const loaded = await getLicenseByKey(store, normalizeLicenseKey(record.licenseKey));

  assert.equal(updated.status, "BLOCKED");
  assert.equal(loaded.notes, "manual support block");
  assert.equal(loaded.updatedAt, "2026-04-02T09:30:00.000Z");
});

test("createLicense rejects malformed minimal contract records", async () => {
  const store = createMemoryStore();

  await assert.rejects(
    () =>
      createLicense(store, buildRecord({
        maxDevices: 2,
      })),
    /maxDevices must be 3/,
  );
});
