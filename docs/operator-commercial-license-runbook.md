# Operator Commercial License Runbook

## Scope

This runbook is for manual support handling of the Visual Pomodoro commercial license layer.

It covers:

- commercial license lookup
- device occupancy review
- block / unblock / reset-devices decisions
- manual decision on whether formal license token may be issued

It does not cover:

- trial system changes
- token format changes
- Etsy automation
- admin UI
- backend refactors

---

## When To Use This Runbook

Use this runbook when a customer:

- reports a commercial activation issue
- asks why activation succeeded but app is not yet unlocked
- hits the device limit
- changes devices
- is blocked and requests reinstatement
- cannot be matched to an existing commercial license record

Do not use this runbook for:

- trial-only issues
- PWA cache-only issues
- formal license token format debugging

---

## Standard Handling Order

Always follow this order:

1. collect the customer `licenseKey`
2. collect the customer `deviceId`
3. run commercial license lookup
4. verify `status`
5. verify current `activatedDevices`
6. decide whether support action is needed:
   - no action
   - block
   - unblock
   - reset-devices
7. decide whether formal license token may be issued manually
8. document what was done

Do not issue a formal license token before lookup and device review are completed.

---

## Lookup Check Items

When reviewing the commercial license record, check all of the following:

- `licenseKey` exists
- `status`
- `plan`
- `maxDevices`
- `activatedDevices.length`
- whether the reported `deviceId` is already present
- whether the record appears supportable and internally consistent
- `issuedAt`
- `expiresAt` if present
- recent timestamps such as `updatedAt`

Minimum interpretation:

- `ACTIVE` may proceed to further review
- `BLOCKED` may not proceed to formal issuance until manually unblocked
- `EXPIRED` may not proceed to formal issuance
- same `deviceId` means idempotent continuation
- 3 distinct devices means a 4th device is not automatically eligible

---

## When To Use Block / Unblock / Reset-Devices

### Use `block` when:

- a payment or fraud issue is confirmed
- support must immediately stop further activation handling
- a license should be temporarily or permanently denied service

### Use `unblock` when:

- the support issue is resolved
- the commercial license record is again eligible for normal handling

### Use `reset-devices` when:

- a legitimate customer replaces or loses devices
- support has approved clearing the device occupancy state
- the customer should be allowed to activate again without deleting the license record

Do not use `reset-devices` casually.

It changes device occupancy history and should only be done after a support decision.

---

## When Manual Formal License Token May Be Issued

Manual formal license token may be issued only when all are true:

- commercial license record exists
- `status` is `ACTIVE`
- customer `deviceId` is already validly represented, or support has approved the current device state
- device occupancy is acceptable under current policy
- support has positively confirmed the request

Manual issuance should use the existing formal license token generation baseline without altering token format or trust boundary.

---

## When Manual Formal License Token Must Not Be Issued

Do not issue a formal license token when any of the following is true:

- commercial license record does not exist
- license is `BLOCKED`
- license is `EXPIRED`
- a 4th device is being requested and no support-approved reset decision has been made
- customer-provided `deviceId` cannot be confidently matched or approved
- operator has not completed lookup and device review

---

## Common Scenario Handling

### 1. Same-device repeated activation

Expected state:

- customer `deviceId` already exists in `activatedDevices`

Handling:

- treat as idempotent same-device continuation
- no device slot escalation
- if everything else is valid, this can still be eligible for manual formal token issuance

### 2. 4th device request

Expected state:

- current `activatedDevices.length` is already `3`
- customer `deviceId` is new

Handling:

- do not issue formal token immediately
- review whether this is a legitimate replacement-device case
- if approved, use `reset-devices` only after support decision
- otherwise deny the request

### 3. Customer changed devices

Expected state:

- customer reports a new device
- previous device list is full or stale

Handling:

- verify customer identity and case history
- if support approves, use `reset-devices`
- then customer may re-activate on the new device
- only after the new device state is acceptable should formal token issuance be considered

### 4. License is blocked

Expected state:

- `status = BLOCKED`

Handling:

- do not issue formal token
- determine whether the block reason is still valid
- if resolved, use `unblock`
- only after unblock and re-check may the request proceed

### 5. Record does not exist

Expected state:

- lookup returns no record

Handling:

- do not issue formal token
- confirm customer provided the correct `licenseKey`
- if still missing, escalate as record/issuance mismatch instead of trying to bypass the system

---

## Minimum Operator Checklist

Use this checklist for every manual support case.

- [ ] Collected customer `licenseKey`
- [ ] Collected customer `deviceId`
- [ ] Ran lookup
- [ ] Confirmed record exists
- [ ] Checked `status`
- [ ] Checked `activatedDevices`
- [ ] Checked whether device is existing or new
- [ ] Checked whether device limit is already reached
- [ ] Decided whether `block`, `unblock`, or `reset-devices` is needed
- [ ] Confirmed whether manual formal token issuance is allowed
- [ ] If issuing token, used existing formal license generation flow unchanged
- [ ] Recorded final support action taken

---

## Current-Phase Rule

For this phase:

- commercial activation proves server-side entitlement state
- formal license token remains the actual unlock artifact for the app
- operators must not bypass lookup and device review
- operators must not invent new issuance rules outside this runbook
