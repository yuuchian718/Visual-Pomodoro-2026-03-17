# Minimal Issuance Tracking Fields

## 1. Goal

Issuance tracking is needed now because formal license tokens are still handled manually or semi-manually after commercial case review.

The smallest problem it solves is:

- knowing what was issued
- for which device it was issued
- by which operator it was handled
- whether the customer was actually sent the final result

This is not about building a full system. It is about making the current manual process traceable and consistent.

---

## 2. Scope

This tracking design currently applies only to:

- formal license manual issuance
- formal license semi-manual issuance
- support-side issuance recordkeeping

It is not:

- a full order system
- a full admin backend
- a complete customer lifecycle system

---

## 3. Minimal Field List

The minimum issuance tracking record should include:

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
  Required. Internal unique identifier for this issuance record.

- `caseId`  
  Required. Support case identifier connected to this issuance decision.

- `handledAt`  
  Required. Timestamp for when this handling step was completed.

- `operatorName`  
  Required. Human operator name or stable internal operator identifier.

- `licenseKey`  
  Required. Commercial license key used for the lookup and decision.

- `deviceId`  
  Required. Device being reviewed for issuance.

- `commercialRecordStatus`  
  Required. Commercial record status seen at handling time, such as `ACTIVE`, `BLOCKED`, or `EXPIRED`.

- `actionTaken`  
  Required. Actual operator action, such as `LOOKUP_ONLY`, `ISSUED_FORMAL_TOKEN`, `RESET_DEVICES`, or `NO_TOKEN_ISSUED`.

- `whetherFormalTokenIssued`  
  Required. `YES` or `NO`.

- `issuedTokenForDeviceId`  
  Optional. Device the formal token was actually issued for. Use `null` when no token was issued.

- `issuedAt`  
  Optional. Timestamp for when the formal token was issued. Use `null` when no token was issued.

- `issuanceResult`  
  Required. Short result label such as `ISSUED`, `NOT_ISSUED`, `BLOCKED`, `WAITING_FOR_REVIEW`, or `REJECTED_DEVICE_LIMIT`.

- `customerReplySent`  
  Required. Whether a customer-facing reply was sent after the handling step.

- `notes`  
  Optional. Short factual notes that match the real support action.

---

## 5. Minimal Usage Rules

- Run lookup before recording issuance.
- The record must match the actual support action taken.
- Do not record unnecessary sensitive information.
- Do not store the formal token body as routine logging content.
- If no token was issued, record that clearly.
- If device state changed through support action, that should be reflected in `actionTaken` and `notes`.

---

## 6. Smallest Future Extension Points

- server-side issuance record storage
- issuance query for operator review
- delivery tracking later

---

## 7. One-Line Conclusion

At the current phase, issuance tracking should stay small and practical: record who reviewed the case, what was decided, whether a formal token was issued, and for which device, without turning the project into a full order or admin system.
