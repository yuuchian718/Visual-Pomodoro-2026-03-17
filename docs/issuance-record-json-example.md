# Issuance Record JSON Example

## 1. Goal

This document provides a minimal JSON reference for future issuance record storage.

It exists to:

- align field names before implementation
- reduce ambiguity in later server-side storage work
- keep manual and semi-manual issuance records consistent

Defining JSON examples first helps the later issuance record store stay small, predictable, and consistent with the current operator workflow.

---

## 2. Minimal JSON Structure Examples

### Example A: Formal Token Issued

```json
{
  "issuanceId": "iss_20260402_0001",
  "caseId": "VP-SUPPORT-2026-0402-0001",
  "handledAt": "2026-04-02T09:10:00.000Z",
  "operatorName": "Alice Chen",
  "licenseKey": "VP-ABCD-EFGH-IJKL",
  "deviceId": "LL-8QW12ER45TYU",
  "commercialRecordStatus": "ACTIVE",
  "actionTaken": "ISSUED_FORMAL_TOKEN",
  "whetherFormalTokenIssued": "YES",
  "issuedTokenForDeviceId": "LL-8QW12ER45TYU",
  "issuedAt": "2026-04-02T09:10:00.000Z",
  "issuanceResult": "ISSUED",
  "customerReplySent": "YES",
  "notes": "Lookup completed first. Device state acceptable. Formal token issued through the existing manual issuance flow."
}
```

### Example B: Token Not Issued

```json
{
  "issuanceId": "iss_20260402_0002",
  "caseId": "VP-SUPPORT-2026-0402-0002",
  "handledAt": "2026-04-02T09:25:00.000Z",
  "operatorName": "Alice Chen",
  "licenseKey": "VP-ABCD-EFGH-IJKL",
  "deviceId": "LL-NEWDEVICE1234",
  "commercialRecordStatus": "ACTIVE",
  "actionTaken": "NO_TOKEN_ISSUED",
  "whetherFormalTokenIssued": "NO",
  "issuedTokenForDeviceId": null,
  "issuedAt": null,
  "issuanceResult": "REJECTED_DEVICE_LIMIT",
  "customerReplySent": "YES",
  "notes": "Fourth-device request. No support-approved device reset had been completed."
}
```

---

## 3. Required Fields In Examples

The minimum JSON shape should include:

- `issuanceId`
- `caseId`
- `handledAt`
- `operatorName`
- `licenseKey`
- `deviceId`
- `commercialRecordStatus`
- `actionTaken`
- `whetherFormalTokenIssued`
- `issuedTokenForDeviceId`
- `issuedAt`
- `issuanceResult`
- `customerReplySent`
- `notes`

---

## 4. Field Notes

- `issuanceId`  
  Unique identifier for the issuance record itself.

- `caseId`  
  Support case identifier tied to the operator handling flow.

- `handledAt`  
  Timestamp for when the operator completed this handling step.

- `operatorName`  
  Human operator name or stable internal operator identifier.

- `licenseKey`  
  Commercial license key reviewed during the case.

- `deviceId`  
  Device under review for token issuance.

- `commercialRecordStatus`  
  Commercial record status seen during review, such as `ACTIVE`, `BLOCKED`, or `EXPIRED`.

- `actionTaken`  
  Actual action performed, such as `ISSUED_FORMAL_TOKEN` or `NO_TOKEN_ISSUED`.

- `whetherFormalTokenIssued`  
  `YES` when a formal token was issued, otherwise `NO`.

- `issuedTokenForDeviceId`  
  Device the token was issued for; use `null` when no token was issued.

- `issuedAt`  
  Timestamp of token issuance; use `null` when no token was issued.

- `issuanceResult`  
  Short result label such as `ISSUED`, `NOT_ISSUED`, `BLOCKED`, `WAITING_FOR_REVIEW`, or `REJECTED_DEVICE_LIMIT`.

- `customerReplySent`  
  Whether the customer was sent a follow-up reply after handling.

- `notes`  
  Short factual note describing the real outcome.

### Null / Value Rules For Non-Issued Cases

When no formal token is issued:

- `whetherFormalTokenIssued` should be `NO`
- `issuedTokenForDeviceId` should be `null`
- `issuedAt` should be `null`
- `issuanceResult` should use the actual non-issuance outcome, for example:
  - `NOT_ISSUED`
  - `BLOCKED`
  - `WAITING_FOR_REVIEW`
  - `REJECTED_DEVICE_LIMIT`

---

## 5. Usage Boundaries

- Do not store the formal token body in this record.
- The record must match the actual operator action taken.
- Always run lookup before writing an issuance record.
- This record is for issuance tracking only and is not a replacement for a full order system.

---

## 6. One-Line Conclusion

This JSON example is the field-alignment reference for any future issuance record store, so later implementation can stay small and consistent with the current manual issuance workflow.
