import "dotenv/config";

import {
  createLicense,
  getLicenseByKey,
  getLicenseStore,
} from "../netlify/functions/lib/license-store.mjs";

const nowIso = new Date().toISOString();

const makeDevice = (deviceId, offsetMinutes = 0) => {
  const timestamp = new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();

  return {
    deviceId,
    activatedAt: timestamp,
    lastSeenAt: timestamp,
  };
};

const buildRecord = ({
  id,
  licenseKey,
  status,
  activatedDevices,
  expiresAt = null,
  notes,
}) => ({
  id,
  licenseKey,
  redemptionCode: null,
  status,
  plan: "COMMERCIAL_VALIDATION",
  maxDevices: 3,
  activatedDevices,
  issuedAt: nowIso,
  expiresAt,
  notes,
  metadata: {
    seedSource: "seed-commercial-license-validation",
  },
  createdAt: nowIso,
  updatedAt: nowIso,
});

const seedRecords = [
  buildRecord({
    id: "seed-active-empty",
    licenseKey: "VP-TEST-ACTIVE-EMPTY",
    status: "ACTIVE",
    activatedDevices: [],
    notes: "Validation seed: ACTIVE with 0 devices",
  }),
  buildRecord({
    id: "seed-active-one",
    licenseKey: "VP-TEST-ACTIVE-ONE",
    status: "ACTIVE",
    activatedDevices: [
      makeDevice("VP-TEST-DEVICE-ONE", 30),
    ],
    notes: "Validation seed: ACTIVE with 1 existing device",
  }),
  buildRecord({
    id: "seed-active-two",
    licenseKey: "VP-TEST-ACTIVE-TWO",
    status: "ACTIVE",
    activatedDevices: [
      makeDevice("VP-TEST-DEVICE-TWO-A", 60),
      makeDevice("VP-TEST-DEVICE-TWO-B", 45),
    ],
    notes: "Validation seed: ACTIVE with 2 devices",
  }),
  buildRecord({
    id: "seed-active-three",
    licenseKey: "VP-TEST-ACTIVE-THREE",
    status: "ACTIVE",
    activatedDevices: [
      makeDevice("VP-TEST-DEVICE-THREE-A", 90),
      makeDevice("VP-TEST-DEVICE-THREE-B", 75),
      makeDevice("VP-TEST-DEVICE-THREE-C", 15),
    ],
    notes: "Validation seed: ACTIVE with 3 devices",
  }),
  buildRecord({
    id: "seed-blocked",
    licenseKey: "VP-TEST-BLOCKED",
    status: "BLOCKED",
    activatedDevices: [
      makeDevice("VP-TEST-DEVICE-BLOCKED", 20),
    ],
    notes: "Validation seed: BLOCKED license",
  }),
  buildRecord({
    id: "seed-expired",
    licenseKey: "VP-TEST-EXPIRED",
    status: "EXPIRED",
    activatedDevices: [
      makeDevice("VP-TEST-DEVICE-EXPIRED", 120),
    ],
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    notes: "Validation seed: EXPIRED license",
  }),
];

const main = async () => {
  const store = getLicenseStore();

  console.log("Seeding commercial license validation records...");

  for (const record of seedRecords) {
    const existing = await getLicenseByKey(store, record.licenseKey);

    if (existing) {
      console.log(`skipped  ${record.licenseKey}  already exists`);
      continue;
    }

    await createLicense(store, record);
    console.log(`created  ${record.licenseKey}  status=${record.status} devices=${record.activatedDevices.length}`);
  }

  console.log("Seed complete.");
};

main().catch((error) => {
  console.error("Seed failed.");
  console.error(error);
  process.exitCode = 1;
});
