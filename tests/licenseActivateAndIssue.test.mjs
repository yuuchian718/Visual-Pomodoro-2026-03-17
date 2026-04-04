import test from "node:test";
import assert from "node:assert/strict";
import { verifyAsync } from "@noble/ed25519";

import { createLicense } from "../netlify/functions/lib/license-store.mjs";
import {
  activateLicenseAndIssueFormalToken,
} from "../netlify/functions/license-activate-and-issue.mjs";
import { buildPermanentLicenseMessage } from "../netlify/functions/lib/formal-license-token.mjs";

const TEST_PRIVATE_KEY_B64 = "u6n+4/4TLx6hgW6utED8nSv0epVkaN5JDSOZXVQP5cs=";
const TEST_PUBLIC_KEY_B64 = "N567DMrVJta5Vquo0OPOIkZDo+thb7laBa2btht4jmU=";

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

const assertFormalTokenMatchesDevice = async (formalToken, deviceId) => {
  const parts = formalToken.split(".");

  assert.equal(parts.length, 2);
  assert.equal(parts[0], "KOTO1");

  const verified = await verifyAsync(
    Buffer.from(parts[1], "base64"),
    new TextEncoder().encode(buildPermanentLicenseMessage(deviceId)),
    Buffer.from(TEST_PUBLIC_KEY_B64, "base64"),
  );

  assert.equal(verified, true);
};

test("ACTIVE + allowed device returns success and formalToken", async () => {
  const store = createMemoryStore();
  await createLicense(store, buildRecord());

  const result = await activateLicenseAndIssueFormalToken({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "ll-device000001",
    privateKeyB64: TEST_PRIVATE_KEY_B64,
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.code, "FORMAL_TOKEN_ISSUED");
  assert.equal(result.body.deviceId, "LL-DEVICE000001");
  assert.equal(result.body.activation.result, "ACTIVATED");
  assert.ok(result.body.formalToken);
  await assertFormalTokenMatchesDevice(result.body.formalToken, "LL-DEVICE000001");
});

test("same-device repeated activation still returns success and formalToken", async () => {
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

  const result = await activateLicenseAndIssueFormalToken({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000001",
    privateKeyB64: TEST_PRIVATE_KEY_B64,
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.activation.result, "ALREADY_ACTIVATED");
  assert.ok(result.body.formalToken);
  await assertFormalTokenMatchesDevice(result.body.formalToken, "LL-DEVICE000001");
});

test("3rd device allowed returns formalToken", async () => {
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

  const result = await activateLicenseAndIssueFormalToken({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000003",
    privateKeyB64: TEST_PRIVATE_KEY_B64,
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.activation.result, "ACTIVATED");
  assert.ok(result.body.formalToken);
  await assertFormalTokenMatchesDevice(result.body.formalToken, "LL-DEVICE000003");
});

test("4th device rejected returns no formalToken", async () => {
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

  const result = await activateLicenseAndIssueFormalToken({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000004",
    privateKeyB64: TEST_PRIVATE_KEY_B64,
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.code, "DEVICE_LIMIT_REACHED");
  assert.equal(result.body.formalToken, undefined);
});

test("BLOCKED rejected returns no formalToken", async () => {
  const store = createMemoryStore();
  await createLicense(store, buildRecord({ status: "BLOCKED" }));

  const result = await activateLicenseAndIssueFormalToken({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000001",
    privateKeyB64: TEST_PRIVATE_KEY_B64,
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.code, "LICENSE_BLOCKED");
  assert.equal(result.body.formalToken, undefined);
});

test("EXPIRED rejected returns no formalToken", async () => {
  const store = createMemoryStore();
  await createLicense(
    store,
    buildRecord({
      status: "EXPIRED",
      expiresAt: "2026-03-31T09:30:00.000Z",
    }),
  );

  const result = await activateLicenseAndIssueFormalToken({
    store,
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-DEVICE000001",
    privateKeyB64: TEST_PRIVATE_KEY_B64,
    nowIso: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.code, "LICENSE_EXPIRED");
  assert.equal(result.body.formalToken, undefined);
});
