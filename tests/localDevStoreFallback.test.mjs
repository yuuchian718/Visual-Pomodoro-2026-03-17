import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createCommercialCertificateClaim,
  getCommercialCertificateClaimByToken,
  getCommercialCertificateClaimStore,
} from "../netlify/functions/lib/commercial-certificate-claim-store.mjs";
import {
  createLicense,
  getLicenseByKey,
  getLicenseStore,
} from "../netlify/functions/lib/license-store.mjs";
import { claimCommercialCertificate } from "../netlify/functions/commercial-certificate-claim.mjs";

const buildClaimRecord = (overrides = {}) => ({
  claimToken: "claim_vp_test_0002",
  email: null,
  commercialCertificate: "VP-TEST-ACTIVE-EMPTY",
  claimedAt: null,
  claimStatus: "ISSUED",
  issuedCommercialCertificate: null,
  issuedAt: null,
  ...overrides,
});

const buildLicenseRecord = (overrides = {}) => ({
  id: "lic_test_local_001",
  licenseKey: "VP-LOCAL-TEST-0001",
  redemptionCode: null,
  status: "ACTIVE",
  plan: "COMMERCIAL_CLAIM",
  maxDevices: 3,
  activatedDevices: [],
  issuedAt: "2026-04-03T10:00:00.000Z",
  expiresAt: null,
  notes: null,
  metadata: { source: "test" },
  createdAt: "2026-04-03T10:00:00.000Z",
  updatedAt: "2026-04-03T10:00:00.000Z",
  ...overrides,
});

test("claim and license store factories fall back to local dev store when forced", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vp-local-store-"));
  process.env.VISUAL_POMODORO_FORCE_LOCAL_STORE = "1";
  process.env.VISUAL_POMODORO_LOCAL_STORE_DIR = tempDir;

  try {
    const claimStore = getCommercialCertificateClaimStore();
    const licenseStore = getLicenseStore();

    await createCommercialCertificateClaim(claimStore, buildClaimRecord());
    await createLicense(licenseStore, buildLicenseRecord());

    const claim = await getCommercialCertificateClaimByToken(claimStore, "claim_vp_test_0002");
    const license = await getLicenseByKey(licenseStore, "VP-LOCAL-TEST-0001");

    assert.equal(claim?.claimToken, "claim_vp_test_0002");
    assert.equal(license?.licenseKey, "VP-LOCAL-TEST-0001");
  } finally {
    delete process.env.VISUAL_POMODORO_FORCE_LOCAL_STORE;
    delete process.env.VISUAL_POMODORO_LOCAL_STORE_DIR;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("commercial claim flow works with local dev store fallback", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vp-local-claim-"));
  process.env.VISUAL_POMODORO_FORCE_LOCAL_STORE = "1";
  process.env.VISUAL_POMODORO_LOCAL_STORE_DIR = tempDir;

  try {
    const claimStore = getCommercialCertificateClaimStore();
    const licenseStore = getLicenseStore();

    await createCommercialCertificateClaim(claimStore, buildClaimRecord());

    const result = await claimCommercialCertificate({
      claimStore,
      licenseStore,
      claimToken: "claim_vp_test_0002",
      email: "user@example.com",
      claimedAt: "2026-04-03T10:00:00.000Z",
    });

    const updatedClaim = await getCommercialCertificateClaimByToken(
      claimStore,
      "claim_vp_test_0002",
    );
    const createdLicense = await getLicenseByKey(
      licenseStore,
      result.body.commercialCertificate,
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.ok, true);
    assert.equal(updatedClaim?.email, "user@example.com");
    assert.equal(createdLicense?.status, "ACTIVE");
  } finally {
    delete process.env.VISUAL_POMODORO_FORCE_LOCAL_STORE;
    delete process.env.VISUAL_POMODORO_LOCAL_STORE_DIR;
    await rm(tempDir, { recursive: true, force: true });
  }
});
