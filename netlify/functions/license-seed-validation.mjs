import {
  createLicense,
  getLicenseByKey,
  getLicenseStore,
} from "./lib/license-store.mjs";
import { authorizeOperatorRequest, jsonResponse } from "./lib/license-ops.mjs";

const buildActivatedDevice = (deviceId, timestamp) => ({
  deviceId,
  activatedAt: timestamp,
  lastSeenAt: timestamp,
});

const subtractMinutes = (isoString, minutes) =>
  new Date(Date.parse(isoString) - minutes * 60 * 1000).toISOString();

const subtractDays = (isoString, days) =>
  new Date(Date.parse(isoString) - days * 24 * 60 * 60 * 1000).toISOString();

export const buildValidationSeedRecords = (nowIso) => [
  {
    id: "seed-active-empty",
    licenseKey: "VP-TEST-ACTIVE-EMPTY",
    redemptionCode: null,
    status: "ACTIVE",
    plan: "COMMERCIAL_VALIDATION",
    maxDevices: 3,
    activatedDevices: [],
    issuedAt: nowIso,
    expiresAt: null,
    notes: "Validation seed: ACTIVE with 0 devices",
    metadata: {
      seedSource: "license-seed-validation",
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "seed-active-one",
    licenseKey: "VP-TEST-ACTIVE-ONE",
    redemptionCode: null,
    status: "ACTIVE",
    plan: "COMMERCIAL_VALIDATION",
    maxDevices: 3,
    activatedDevices: [
      buildActivatedDevice("VP-TEST-DEVICE-ONE", subtractMinutes(nowIso, 30)),
    ],
    issuedAt: nowIso,
    expiresAt: null,
    notes: "Validation seed: ACTIVE with 1 existing device",
    metadata: {
      seedSource: "license-seed-validation",
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "seed-active-two",
    licenseKey: "VP-TEST-ACTIVE-TWO",
    redemptionCode: null,
    status: "ACTIVE",
    plan: "COMMERCIAL_VALIDATION",
    maxDevices: 3,
    activatedDevices: [
      buildActivatedDevice("VP-TEST-DEVICE-TWO-A", subtractMinutes(nowIso, 60)),
      buildActivatedDevice("VP-TEST-DEVICE-TWO-B", subtractMinutes(nowIso, 45)),
    ],
    issuedAt: nowIso,
    expiresAt: null,
    notes: "Validation seed: ACTIVE with 2 devices",
    metadata: {
      seedSource: "license-seed-validation",
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "seed-active-three",
    licenseKey: "VP-TEST-ACTIVE-THREE",
    redemptionCode: null,
    status: "ACTIVE",
    plan: "COMMERCIAL_VALIDATION",
    maxDevices: 3,
    activatedDevices: [
      buildActivatedDevice("VP-TEST-DEVICE-THREE-A", subtractMinutes(nowIso, 90)),
      buildActivatedDevice("VP-TEST-DEVICE-THREE-B", subtractMinutes(nowIso, 75)),
      buildActivatedDevice("VP-TEST-DEVICE-THREE-C", subtractMinutes(nowIso, 15)),
    ],
    issuedAt: nowIso,
    expiresAt: null,
    notes: "Validation seed: ACTIVE with 3 devices",
    metadata: {
      seedSource: "license-seed-validation",
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "seed-blocked",
    licenseKey: "VP-TEST-BLOCKED",
    redemptionCode: null,
    status: "BLOCKED",
    plan: "COMMERCIAL_VALIDATION",
    maxDevices: 3,
    activatedDevices: [
      buildActivatedDevice("VP-TEST-DEVICE-BLOCKED", subtractMinutes(nowIso, 20)),
    ],
    issuedAt: nowIso,
    expiresAt: null,
    notes: "Validation seed: BLOCKED license",
    metadata: {
      seedSource: "license-seed-validation",
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "seed-expired",
    licenseKey: "VP-TEST-EXPIRED",
    redemptionCode: null,
    status: "EXPIRED",
    plan: "COMMERCIAL_VALIDATION",
    maxDevices: 3,
    activatedDevices: [
      buildActivatedDevice("VP-TEST-DEVICE-EXPIRED", subtractMinutes(nowIso, 120)),
    ],
    issuedAt: nowIso,
    expiresAt: subtractDays(nowIso, 1),
    notes: "Validation seed: EXPIRED license",
    metadata: {
      seedSource: "license-seed-validation",
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];

export const seedValidationLicenses = async ({
  store,
  nowIso = new Date().toISOString(),
}) => {
  const records = buildValidationSeedRecords(nowIso);
  const created = [];
  const skipped = [];

  for (const record of records) {
    const existing = await getLicenseByKey(store, record.licenseKey);

    if (existing) {
      skipped.push(record.licenseKey);
      continue;
    }

    await createLicense(store, record);
    created.push(record.licenseKey);
  }

  return {
    created,
    skipped,
    total: records.length,
  };
};

export const createLicenseSeedValidationHandler =
  ({ storeFactory = getLicenseStore } = {}) =>
  async (request) => {
    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = await authorizeOperatorRequest(request);

    if (!auth.ok) {
      return auth.response;
    }

    const result = await seedValidationLicenses({
      store: storeFactory(),
    });

    return jsonResponse(200, {
      ok: true,
      ...result,
    });
  };

export default createLicenseSeedValidationHandler();
