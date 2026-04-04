# Formal License Manual Issuance Record Template

## Scope

This document is a manual record template for Visual Pomodoro support operators when a formal license token is handled manually.

It applies to:

- manual review before formal token issuance
- manual formal token issuance decisions
- manual support recordkeeping after token handling

It does not apply to:

- changing trial logic
- changing formal license token logic
- Etsy automation
- admin UI
- code changes

---

## Usage

Use this template once a support case reaches the stage where an operator is reviewing whether a formal license token may be issued manually.

Recommended usage:

1. run lookup first
2. review commercial record status and device occupancy
3. decide whether support action is needed
4. decide whether formal token may be issued
5. record the exact action taken

Create one record per support handling event.

If the same customer case is reviewed again later, create a new record entry rather than silently overwriting the previous one.

---

## Recommended Record Fields

Each manual issuance record should include at least:

- `caseId`
- `handledAt`
- `operatorName`
- `licenseKey`
- `deviceId`
- `commercialRecordStatus`
- `activatedDevicesSnapshot`
- `actionTaken`
- `reason`
- `whetherFormalTokenIssued`
- `issuedTokenForDeviceId`
- `customerReplySent`
- `notes`

### Field Notes

- `caseId`: internal support case reference
- `handledAt`: timestamp when the operator completed this handling step
- `operatorName`: human operator name or stable internal identifier
- `licenseKey`: commercial license key used for lookup
- `deviceId`: device currently under review
- `commercialRecordStatus`: record status seen at the time of handling, such as `ACTIVE`, `BLOCKED`, or `EXPIRED`
- `activatedDevicesSnapshot`: copied snapshot of current activated devices at review time
- `actionTaken`: what the operator actually did, such as `LOOKUP_ONLY`, `BLOCK`, `UNBLOCK`, `RESET_DEVICES`, `ISSUED_FORMAL_TOKEN`, or `NO_TOKEN_ISSUED`
- `reason`: short operational reason for the decision
- `whetherFormalTokenIssued`: `YES` or `NO`
- `issuedTokenForDeviceId`: the exact device the issued token was intended for, or `null` if no token was issued
- `customerReplySent`: whether a customer-facing reply was sent after handling
- `notes`: short factual notes that match the actual support action

---

## Blank Record Template

```md
Case ID: 
Handled At: 
Operator Name: 

License Key: 
Device ID: 

Commercial Record Status: 
Activated Devices Snapshot:
- 

Action Taken: 
Reason: 

Whether Formal Token Issued: 
Issued Token For Device ID: 

Customer Reply Sent: 
Notes:
- 
```

---

## Filled Example

```md
Case ID: VP-SUPPORT-2026-0401-0012
Handled At: 2026-04-01T16:20:00.000Z
Operator Name: Alice Chen

License Key: VP-ABCD-EFGH-IJKL
Device ID: LL-8QW12ER45TYU

Commercial Record Status: ACTIVE
Activated Devices Snapshot:
- LL-8QW12ER45TYU | activatedAt=2026-04-01T10:00:00.000Z | lastSeenAt=2026-04-01T15:55:00.000Z

Action Taken: ISSUED_FORMAL_TOKEN
Reason: Same-device activation already present and record remained eligible for manual unlock handling.

Whether Formal Token Issued: YES
Issued Token For Device ID: LL-8QW12ER45TYU

Customer Reply Sent: YES
Notes:
- Lookup completed before issuance.
- Record status was ACTIVE at review time.
- No device reset was required.
- Formal token was generated using the existing manual issuance flow.
```

---

## Recording Notes

- Do not record unnecessary sensitive information.
- Do not paste payment details, private customer data, or unrelated personal information into the record.
- Do not alter, rewrite, or annotate the formal token content itself.
- If token handling must be recorded, note that a token was issued, but avoid storing unnecessary token body content in routine support logs unless your internal policy explicitly requires it.
- Always run lookup before deciding whether a formal token may be issued.
- The record must match the actual support action taken.
- If no token was issued, record that clearly.
- If `block`, `unblock`, or `reset-devices` was used, include that action explicitly in `actionTaken` and `notes`.

---

## Current-Phase Rule

For the current phase:

- commercial activation proves server-side eligibility state
- formal license token remains the actual unlock artifact
- manual issuance must follow the existing operator runbook
- this record template is only for documenting the support handling process
