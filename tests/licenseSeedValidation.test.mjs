import test from "node:test";
import assert from "node:assert/strict";

import { getLicenseByKey } from "../netlify/functions/lib/license-store.mjs";
import {
  createLicenseSeedValidationHandler,
  seedValidationLicenses,
} from "../netlify/functions/license-seed-validation.mjs";

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

test("seedValidationLicenses creates the expected validation records", async () => {
  const store = createMemoryStore();

  const result = await seedValidationLicenses({
    store,
    nowIso: "2026-04-02T15:00:00.000Z",
  });

  const activeThree = await getLicenseByKey(store, "VP-TEST-ACTIVE-THREE");
  const blocked = await getLicenseByKey(store, "VP-TEST-BLOCKED");

  assert.equal(result.created.length, 6);
  assert.equal(result.skipped.length, 0);
  assert.equal(result.total, 6);
  assert.equal(activeThree?.activatedDevices.length, 3);
  assert.equal(blocked?.status, "BLOCKED");
});

test("seedValidationLicenses is idempotent and does not duplicate existing records", async () => {
  const store = createMemoryStore();

  const first = await seedValidationLicenses({
    store,
    nowIso: "2026-04-02T15:00:00.000Z",
  });
  const second = await seedValidationLicenses({
    store,
    nowIso: "2026-04-02T15:05:00.000Z",
  });

  const activeOne = await getLicenseByKey(store, "VP-TEST-ACTIVE-ONE");

  assert.equal(first.created.length, 6);
  assert.equal(second.created.length, 0);
  assert.equal(second.skipped.length, 6);
  assert.equal(activeOne?.activatedDevices.length, 1);
});

test("license seed validation route seeds records when authorized", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createLicenseSeedValidationHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/license-seed-validation", {
      method: "POST",
      headers: {
        "x-license-operator-secret": "test-secret",
      },
    }),
  );

  const body = await response.json();
  const activeEmpty = await getLicenseByKey(store, "VP-TEST-ACTIVE-EMPTY");

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.created.length, 6);
  assert.equal(body.skipped.length, 0);
  assert.equal(body.total, 6);
  assert.equal(activeEmpty?.status, "ACTIVE");
});

test("license seed validation route skips existing records on repeat runs", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createLicenseSeedValidationHandler({ storeFactory: () => store });

  const makeRequest = () =>
    new Request("http://localhost/.netlify/functions/license-seed-validation", {
      method: "POST",
      headers: {
        "x-license-operator-secret": "test-secret",
      },
    });

  const firstResponse = await handler(makeRequest());
  const secondResponse = await handler(makeRequest());

  const firstBody = await firstResponse.json();
  const secondBody = await secondResponse.json();

  assert.equal(firstBody.created.length, 6);
  assert.equal(secondBody.created.length, 0);
  assert.equal(secondBody.skipped.length, 6);
  assert.equal(secondBody.total, 6);
});

test("license seed validation route rejects unauthorized requests", async () => {
  process.env.KOTO_TRIAL_ADMIN_SECRET = "test-secret";
  const store = createMemoryStore();
  const handler = createLicenseSeedValidationHandler({ storeFactory: () => store });

  const response = await handler(
    new Request("http://localhost/.netlify/functions/license-seed-validation", {
      method: "POST",
      headers: {
        "x-license-operator-secret": "wrong-secret",
      },
    }),
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "OPERATOR_SECRET_INVALID");
});
