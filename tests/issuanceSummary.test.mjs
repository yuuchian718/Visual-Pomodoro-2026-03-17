import test from "node:test";
import assert from "node:assert/strict";

import { summarizeIssuanceRecord } from "../netlify/functions/lib/issuance-summary.mjs";

const buildRecord = (overrides = {}) => ({
  issuanceId: "iss_20260402_0401",
  caseId: "VP-SUPPORT-2026-0402-0401",
  handledAt: "2026-04-02T13:00:00.000Z",
  operatorName: "Alice Chen",
  licenseKey: "VP-ABCD-EFGH-IJKL",
  deviceId: "LL-8QW12ER45TYU",
  commercialRecordStatus: "ACTIVE",
  actionTaken: "ISSUED_FORMAL_TOKEN",
  whetherFormalTokenIssued: "YES",
  issuedTokenForDeviceId: "LL-8QW12ER45TYU",
  issuedAt: "2026-04-02T13:00:00.000Z",
  issuanceResult: "ISSUED",
  customerReplySent: "YES",
  notes: "Lookup completed first.",
  ...overrides,
});

test("summarizeIssuanceRecord converts an issued-token record", () => {
  const summary = summarizeIssuanceRecord(buildRecord());

  assert.deepEqual(summary, {
    issuanceId: "iss_20260402_0401",
    caseId: "VP-SUPPORT-2026-0402-0401",
    handledAt: "2026-04-02T13:00:00.000Z",
    operatorName: "Alice Chen",
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-8QW12ER45TYU",
    commercialRecordStatus: "ACTIVE",
    actionTaken: "ISSUED_FORMAL_TOKEN",
    whetherFormalTokenIssued: "YES",
    issuedTokenForDeviceId: "LL-8QW12ER45TYU",
    issuedAt: "2026-04-02T13:00:00.000Z",
    issuanceResult: "ISSUED",
    customerReplySent: "YES",
  });
});

test("summarizeIssuanceRecord converts a non-issued-token record", () => {
  const summary = summarizeIssuanceRecord(
    buildRecord({
      deviceId: "LL-NEWDEVICE1234",
      actionTaken: "NO_TOKEN_ISSUED",
      whetherFormalTokenIssued: "NO",
      issuedTokenForDeviceId: null,
      issuedAt: null,
      issuanceResult: "REJECTED_DEVICE_LIMIT",
      customerReplySent: "NO",
    }),
  );

  assert.deepEqual(summary, {
    issuanceId: "iss_20260402_0401",
    caseId: "VP-SUPPORT-2026-0402-0401",
    handledAt: "2026-04-02T13:00:00.000Z",
    operatorName: "Alice Chen",
    licenseKey: "VP-ABCD-EFGH-IJKL",
    deviceId: "LL-NEWDEVICE1234",
    commercialRecordStatus: "ACTIVE",
    actionTaken: "NO_TOKEN_ISSUED",
    whetherFormalTokenIssued: "NO",
    issuedTokenForDeviceId: null,
    issuedAt: null,
    issuanceResult: "REJECTED_DEVICE_LIMIT",
    customerReplySent: "NO",
  });
});
