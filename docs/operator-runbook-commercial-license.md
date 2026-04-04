# Operator Runbook: Commercial License

## Scope

This runbook is for internal operator / support use.

It covers the current minimum commercial license workflow for:

- commercial activation review
- device-limit handling
- operator API usage
- issuance record handling
- automatic authorization V1
- manual formal token issuance
- final customer unlock guidance

It does not cover:

- changing trial logic
- changing formal license token logic
- backend admin UI
- Etsy automation
- automatic delivery

---

## Current Workflow Status

Current commercial handling is an operator-supported bridge workflow.

Important rule:

- commercial activation success does not mean the app is already unlocked
- commercial activation success only means the server-side commercial eligibility step has succeeded
- the actual unlock still happens through the existing formal license token path

Current phase includes automatic authorization V1.

Important rule:

- commercial license key is the long-lived commercial credential
- formal token is still the actual per-device unlock credential
- V1 only automates formal token issuance and save for the current device after eligibility succeeds
- manual `LICENSE TOKEN` paste and save still remains as fallback

Short version:

1. customer submits commercial license key
2. commercial activation succeeds or fails
3. operator reviews the case
4. if automatic authorization V1 succeeds, the app receives and saves formal token for the current device
5. if automatic authorization V1 is not used or does not complete, operator may still issue formal token manually
6. existing formal license path unlocks the app

---

## System Capability Boundaries

### First-Layer Baseline Already Stable

The following first-layer baseline is already stable and must not be redefined in support handling:

- 7-day trial
- device identity
- server-issued trial
- signed offline trial token
- formal license thin adapter layer
- `AuthGate` / `LockScreen` / `AuthPanel`
- trial-admin `block` / `unblock`
- cookie + blob restoration
- local validation loop
- production trial bootstrap validation

### Second-Layer Commercial Capability Already Available

Commercial layer currently includes:

- commercial license contract
- commercial license store
- `license-activate`
- `license-block`
- `license-unblock`
- `license-reset-devices`
- `license-lookup`

Validated commercial rules:

- `maxDevices = 3`
- same-device repeated activation is idempotent
- 3rd device is allowed
- 4th device is rejected
- `BLOCKED` is rejected
- `EXPIRED` is rejected
- `redemptionCode` is optional

### Front-End Minimum Integration Already Available

Current front-end behavior:

- `AuthPanel` accepts commercial license key input
- front-end submits the commercial license key
- front-end displays activation result
- automatic authorization V1 can request a formal token for the current `deviceId`
- on success, front-end can save the returned formal token through the existing formal token path
- commercial activation still does not replace the existing formal token unlock path

Validated front-end fact:

- input `VP-TEST-ACTIVE-EMPTY`
- page shows `ACTIVATED`
- access still remains `TRIAL`

Validated automatic V1 fact:

- Step 1 can call `license-activate-and-issue`
- when eligible, a formal token is issued for the current `deviceId`
- front-end saves that token through the existing formal token path
- current device unlocks without requiring a separate manual Step 2 click

### Issuance Capability Already Available

Current issuance line includes:

- issuance tracking fields
- issuance record JSON example
- issuance record store
- issuance action helper
- `issuance-record-create`
- `issuance-record-lookup`
- `caseId -> issuanceIds` case index store
- `issuance-records-by-case`
- issuance route thin auth helper
- aligned operator API examples

Validated issuance capability:

- issuance-record-create works
- issuanceId lookup works
- caseId lookup works

### Current Real Unlock Path

The current real unlock path now has two supported forms:

### Automatic Authorization V1

1. customer enters commercial license key in Step 1
2. front-end calls `/.netlify/functions/license-activate-and-issue`
3. server checks commercial eligibility for `licenseKey + deviceId`
4. if allowed, server signs a formal token for the current `deviceId`
5. front-end writes the returned token into the existing `LICENSE TOKEN` field
6. front-end saves the token through the existing formal token path
7. current device unlocks

### Manual Bridge Fallback

1. customer purchases
2. customer submits commercial license key
3. operator reviews activation and eligibility state
4. operator manually signs and sends formal token
5. customer pastes formal token into existing `LICENSE TOKEN`
6. device unlocks through the existing first-layer formal license logic

The key distinction remains:

- commercial key verifies commercial eligibility
- formal token still unlocks the specific device

---

## Standard Workflow

Follow this order.

### 1. Collect Required Information

Collect:

- customer `licenseKey`
- customer `deviceId`
- short issue summary

If the customer says activation succeeded but app is still locked, treat that as normal current-phase behavior until formal token issuance is completed.

### 2. Check Commercial Activation Result

Confirm what result the customer saw:

- `ACTIVATED`
- `ALREADY_ACTIVATED`
- `LICENSE_NOT_FOUND`
- `LICENSE_BLOCKED`
- `LICENSE_EXPIRED`
- `DEVICE_LIMIT_REACHED`

This result is only the commercial activation result.

It is not the same thing as final unlock state.

If automatic authorization V1 succeeds, the formal token save step may also complete immediately for the same device.

If automatic authorization V1 does not complete, continue with the existing operator-assisted flow.

### 2A. Automatic Authorization V1 Route

Current route:

- `POST /.netlify/functions/license-activate-and-issue`

Minimum input:

- `licenseKey`
- `deviceId`

Success response example:

```json
{
  "ok": true,
  "code": "FORMAL_TOKEN_ISSUED",
  "message": "Formal token issued for this device",
  "deviceId": "LL-TESTDEVICE01",
  "formalToken": "KOTO1.<signature>",
  "activation": {
    "result": "ACTIVATED",
    "activationStatus": "NEW_DEVICE"
  }
}
```

Failure response example:

```json
{
  "ok": false,
  "code": "DEVICE_LIMIT_REACHED",
  "message": "DEVICE_LIMIT_REACHED",
  "deviceId": "LL-TESTDEVICE04",
  "activation": {
    "error": "DEVICE_LIMIT_REACHED"
  }
}
```

Support reading rule:

- success means the formal token was issued for this device
- failure means no formal token should be treated as issued

### 3. Run Operator Lookup

Use `license-lookup` to confirm:

- record exists
- `status`
- `plan`
- `maxDevices`
- `activatedDevices`
- whether the customer `deviceId` is already present
- whether the device limit has been reached

### 4. Decide Whether Support Action Is Needed

Possible operator actions:

- no action
- `block`
- `unblock`
- `reset-devices`

Use these only after reviewing the commercial record.

### 5. Decide Whether Manual Formal Token Issuance Is Allowed

Manual formal token issuance is allowed only when:

- commercial record exists
- status is `ACTIVE`
- device occupancy is acceptable
- customer device is acceptable for current support decision
- case review is complete

Manual formal token issuance is not allowed when:

- record does not exist
- status is `BLOCKED`
- status is `EXPIRED`
- this is a new 4th device and no approved reset has occurred
- customer device mapping is unclear

### 6. Record The Issuance Handling

If the case reaches issuance review, record it through the issuance record flow.

Use:

- `issuance-record-create`
- `issuance-record-lookup`
- `issuance-records-by-case` when needed for the same support case

### 7. Issue Formal Token Manually

If approved:

- generate formal token using the current manual local signing method
- ensure the token is for the correct `deviceId`
- send the token to the customer through the current support channel

### 8. Tell Customer How To Finish Unlock

Customer must:

1. open the app
2. paste the formal token into `LICENSE TOKEN`
3. save it on the intended device

Only after this step should the app unlock through the current formal license path.

---

## Operator Checklist

- [ ] Collected `licenseKey`
- [ ] Collected `deviceId`
- [ ] Confirmed customer-reported activation result
- [ ] Ran `license-lookup`
- [ ] Confirmed record exists
- [ ] Checked `status`
- [ ] Checked `activatedDevices`
- [ ] Checked whether device is already present
- [ ] Checked whether device limit is reached
- [ ] Decided whether `block`, `unblock`, or `reset-devices` is needed
- [ ] Decided whether manual formal token issuance is allowed
- [ ] If issuance review happened, created issuance record
- [ ] If token was issued, generated formal token for the correct device
- [ ] Sent customer-facing instructions
- [ ] Confirmed customer understands they must paste the token into `LICENSE TOKEN`

---

## Support Intake Information

Before responding or taking action, confirm:

- exact `licenseKey`
- exact `deviceId`
- what activation result the customer saw
- whether this is the same device or a replacement device
- whether the customer already received a formal token

Do not proceed with issuance review if `licenseKey` or `deviceId` is missing.

---

## Common Status Handling

### `ACTIVATED`

Meaning:

- commercial activation succeeded for a valid device slot

Handling:

- do not assume the app is already unlocked
- explain that commercial activation success is only the commercial step
- if automatic authorization V1 completed, confirm the device actually unlocked
- if automatic authorization V1 did not complete, continue operator review
- if eligible, move to manual formal token issuance fallback

### `BLOCKED`

Meaning:

- commercial record is blocked

Handling:

- do not issue formal token
- investigate whether `unblock` is justified
- only after unblock and re-check may the case proceed

### `EXPIRED`

Meaning:

- commercial record is expired

Handling:

- do not issue formal token
- do not treat this as a front-end issue
- escalate or resolve through the appropriate commercial policy path

### Device Limit Reached

Meaning:

- current device count already equals `maxDevices`
- a new 4th device is not allowed

Handling:

- do not issue formal token automatically
- check whether this is a legitimate replacement-device case
- if approved, use `reset-devices`
- then ask the customer to re-activate if needed

### Same-Device Repeated Activation

Meaning:

- customer device already exists in `activatedDevices`

Handling:

- treat as idempotent continuation
- do not count it as another device
- automatic authorization V1 may still issue a fresh formal token for the same device
- if all other checks pass, the case may still proceed to formal token issuance review

---

## Automatic Authorization V1

Automatic authorization V1 is the smallest automation layer on top of the existing workflow.

It does this:

1. customer enters commercial key in Step 1
2. server validates commercial eligibility
3. if allowed, server signs formal token for the current `deviceId`
4. front-end saves the token through the existing formal token path
5. current device unlocks

It does not do this:

- replace the commercial license key
- replace the formal token model
- unlock another device without issuing a device-bound formal token
- remove the manual Step 2 fallback

### Verified V1 Behavior

- `ACTIVE` new device can auto-unlock
- same-device repeated activation remains idempotent
- `BLOCKED` is rejected
- `EXPIRED` is rejected
- a new 4th device is rejected

### Support Explanation Wording

Use this explanation when needed:

- commercial key is the long-lived commercial authorization credential
- formal token is the per-device unlock credential
- the 2nd or 3rd device may receive a newly issued formal token from the same commercial key
- a new 4th device is not allowed without approved reset handling
- manual `LICENSE TOKEN` paste and save still remains available as fallback

---

## Issuance Record Requirements

When a case reaches issuance handling, record the activity.

Minimum expectations:

- create one issuance record per handling event
- use the actual `caseId`
- use the actual `deviceId`
- record the commercial status seen at handling time
- record whether formal token was issued
- keep notes factual and brief

Do not:

- store unnecessary sensitive data
- store payment details
- store the formal token body in routine logs unless explicitly required by internal policy

If a case is reviewed more than once, create a new issuance record instead of silently overwriting history.

---

## Manual Formal Token Issuance

Current phase only supports manual formal token issuance.

There is no admin UI token issuance tool in this workflow.

Automatic authorization V1 does not change the token model.

It only automates:

- signing a formal token for the current `deviceId`
- returning it from `license-activate-and-issue`
- saving it through the existing front-end token path

Manual fallback still exists:

- operator may still generate a formal token locally
- operator may still send it to the customer manually
- customer may still paste it into `LICENSE TOKEN`

Operator must use the local manual signing method already validated for formal token testing.

Current issuance rule:

- token must be signed for the correct `deviceId`
- permanent message format is `KOTO|<deviceId>|PERMANENT`
- token is then sent to the customer manually

Important:

- do not change token format
- do not invent a new issuance flow
- do not treat commercial activation itself as final unlock

---

## Customer Final Unlock Steps

Tell the customer to do exactly this:

1. open the app on the intended device
2. open the existing `LICENSE TOKEN` input
3. paste the formal token
4. save it

Expected result:

- the device unlocks through the existing formal license validation path

Important customer-facing clarification:

- commercial activation success alone does not immediately unlock the app
- the formal token paste step is still required in the current workflow

---

## Risks And Notes

- `commercial activation success != current access state unlocked`
- front-end activation result is informational for the commercial layer only
- current access state may still show `TRIAL` until formal token is installed
- in automatic authorization V1, install may happen immediately after eligibility succeeds
- operator must not skip record review before issuing formal token
- operator must not promise automation that does not exist
- operator must keep support wording aligned with the current operator-supported bridge workflow
- protected operator POST helper header-secret body-loss bug has already been fixed and regression-tested; header secret + JSON body is now safe to use
- local `netlify dev` must run from the correct project directory
- local automatic issuance route depends on reading `.env`
- `license-activate-and-issue.mjs` explicitly loads `dotenv` to keep local automatic issuance stable
- manual Step 2 token input and save remains available as fallback and support entry point

---

## Explicitly Out Of Scope

The following are not part of the current workflow:

- automatic delivery
- admin dashboard
- Etsy integration
- reporting system
- pagination / filtering UI
- replacing the first-layer trial or formal license baseline

---

## Appendix: Verified Items

Validated items already passed:

- `CLV-01` same-device repeated activation
- `CLV-02` 3rd device allowed
- `CLV-03` 4th device rejected
- `CLV-04` `BLOCKED` rejected
- `CLV-05` `EXPIRED` rejected
- `CLV-06` issuance-record-create
- `CLV-07` issuanceId lookup
- `CLV-08` caseId lookup
- front-end commercial activation result display
- manual formal token shortest unlock path
- automatic authorization V1 end-to-end unlock path
- protected POST operator helper minimal regression fix

Current operator conclusion:

- the commercial layer is usable as an operator-supported bridge workflow
- commercial activation handles server-side eligibility
- formal token still completes the actual unlock
