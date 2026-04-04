# Commercial Activation To Formal License Flow

## Scope

This document defines the smallest operational flow between:

- the existing commercial activation layer
- the existing formal license token baseline

This document does not change:

- trial behavior
- formal license token format
- trial token format
- current trust boundaries
- Etsy automation
- admin UI

This is an operator-facing workflow note for the current phase.

---

## Current Completed Capabilities

The project already has these pieces in place:

- trial baseline is integrated and validated
- formal license token baseline exists and remains unchanged
- commercial license record storage exists
- commercial activation API exists
- commercial operator APIs exist:
  - lookup
  - block
  - unblock
  - reset-devices

Current commercial activation behavior:

- accepts `licenseKey + deviceId`
- enforces same-device idempotency
- allows up to 3 devices
- rejects the 4th device
- respects `BLOCKED` and `EXPIRED`

---

## Current Gap

Commercial activation does not directly unlock the app.

More specifically:

- a successful commercial activation updates the server-side commercial license record
- it does not issue or install a formal license token into the client
- the app’s existing unlock path still depends on the existing formal license token baseline

So at the moment:

- commercial activation confirms server-side eligibility
- formal license token is still the thing that actually unlocks the current app flow

---

## Minimal Manual Operations Flow

This is the smallest operator-driven flow for the current phase.

### Step 1: Customer submits commercial activation

Customer provides:

- `licenseKey`
- current `deviceId`

System outcome:

- activation is accepted or rejected by the commercial activation API

### Step 2: Operator looks up the license record

Operator uses the lookup interface to inspect:

- current `status`
- `plan`
- `maxDevices`
- current `activatedDevices`
- timestamps

Purpose:

- verify the record exists
- verify the license is not blocked or expired
- verify whether the customer device is already registered
- verify whether device slots remain

### Step 3: Operator confirms device occupancy state

Operator checks:

- whether the submitted `deviceId` is already present
- how many devices are already activated
- whether the record is in a supportable state

Expected interpretation:

- same device present: activation is idempotent, no extra slot consumed
- fewer than 3 devices: new activation may be valid
- 3 devices already present: additional device should not be approved without manual action

### Step 4: Operator decides whether to issue formal license token

Operator should manually issue a formal license token only when:

- the commercial license record is valid
- the customer device is correctly represented in the commercial record
- support has confirmed that this customer should be unlocked under the current policy

Operator should not issue a formal license token when:

- the commercial license is `BLOCKED`
- the commercial license is `EXPIRED`
- the device limit has been exceeded and no manual reset decision has been made
- the record cannot be confidently matched to the customer request

### Step 5: Operator manually generates formal license token

Current minimal approach:

- use the existing formal license generation toolchain
- generate the token against the confirmed customer `deviceId`
- send the formal license token to the customer through the current manual support path

Important:

- this step uses the existing formal license baseline as-is
- no new token format is introduced
- no new unlock path is introduced

### Step 6: Customer installs the formal license token

Customer pastes the formal license token into the existing app license token input.

App outcome:

- existing formal license validation path handles unlock
- no commercial activation-specific unlock code is needed in this phase

---

## Operator Lookup Procedure

The operator lookup step is the first required check before manual formal token issuance.

Minimum lookup checklist:

- confirm `licenseKey` exists
- confirm `status`
- confirm `plan`
- confirm `activatedDevices`
- confirm whether the reported `deviceId` matches an existing activated device
- confirm whether a new slot is still available

If any of the above is unclear, stop before issuing the formal token.

---

## How To Confirm Device Occupancy

Operator should use the commercial license record as the source of truth for device occupancy.

Look specifically at:

- `maxDevices`
- `activatedDevices.length`
- each `activatedDevices[].deviceId`
- relevant timestamps such as `activatedAt` and `lastSeenAt`

Practical decision rule:

- if customer device already exists, treat as same-device continuation
- if customer device is new and total activated devices is 0, 1, or 2, it is within current limit
- if customer device is new and total activated devices is already 3, operator must not treat it as automatically eligible

---

## When To Manually Issue Formal License Token

Manual formal token issuance is appropriate only after commercial record validation is complete.

Issue the formal token when all are true:

- commercial license record exists
- status is `ACTIVE`
- device occupancy is acceptable
- operator support decision is positive

Do not issue the formal token when any are true:

- status is `BLOCKED`
- status is `EXPIRED`
- 4th device scenario with no manual reset decision
- customer identity / device mapping is still ambiguous

---

## Role Of Block / Unblock / Reset-Devices

These operator actions are support controls around the commercial record.

### Block

Use `block` when:

- payment or fraud issue is confirmed
- access should be paused
- support needs to stop further activations immediately

Effect in support flow:

- prevents commercial activation from being considered eligible for formal token issuance

### Unblock

Use `unblock` when:

- support has resolved the issue
- the commercial record can return to normal active handling

Effect in support flow:

- allows the commercial record to be eligible again for manual formal token issuance

### Reset Devices

Use `reset-devices` when:

- legitimate customer has replaced devices
- support has approved device reassignment
- the current activated device list should be cleared without deleting the license itself

Effect in support flow:

- gives operator a controlled way to restore future activation eligibility
- avoids changing trial logic or formal token format

---

## Minimal Operational Policy

For the current phase, the commercial layer should be treated as:

- server-side entitlement tracking
- operator-visible support state
- device occupancy source of truth

The formal license layer should remain:

- the actual unlock artifact for the current app

This separation keeps the rollout small and avoids destabilizing the existing baseline.

---

## Smallest Future Automation Extension Points

If automation is added later, the smallest extension points are:

### 1. Activation success hook

After successful commercial activation:

- enqueue a manual-review-ready event
- or trigger a controlled issuance workflow

### 2. Formal token issuance adapter

Wrap the existing formal license generator in a server-side issuance function that:

- takes validated `deviceId`
- generates the existing formal token
- records issuance metadata

### 3. Issuance state on commercial record

Add a small issuance-tracking field later if needed, for example:

- lastIssuedForDeviceId
- lastIssuedAt
- issuanceCount

This should remain optional until the manual flow proves stable.

---

## Recommended Current-Phase Rule

For now:

- commercial activation proves eligibility on the server side
- operator lookup confirms record and device state
- operator manually issues formal license token only after verification
- customer installs the formal token through the existing app flow

That is the smallest safe bridge between the new commercial layer and the already validated formal license baseline.
