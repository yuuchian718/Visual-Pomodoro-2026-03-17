# Commercial License Minimal Contract

## Scope

This document defines the smallest server-side commercial license contract to layer on top of the existing Visual Pomodoro trial/license baseline.

This document does not change:

- trial token format
- formal license token format
- existing trial bootstrap flow
- existing signed offline trial flow
- Etsy automation
- admin UI
- activation UI

This document only defines the minimum record shape and API contract for a future server-side commercial license layer.

---

## 1. License Record

`redemptionCode` is kept as a reserved optional field.

- It should exist in the record shape.
- It may be `null`.
- The current minimal activation flow uses `licenseKey` as the primary input.
- `redemptionCode -> licenseKey` exchange is explicitly out of scope for this phase.

### Record shape

```json
{
  "id": "lic_01JX8P7Q6M0M7P0K4W4L6Q9A1B",
  "licenseKey": "VP-ABCD-EFGH-IJKL",
  "redemptionCode": null,
  "status": "ACTIVE",
  "plan": "LIFETIME",
  "maxDevices": 3,
  "activatedDevices": [
    {
      "deviceId": "LL-8QW12ER45TYU",
      "activatedAt": "2026-04-01T10:00:00.000Z",
      "lastSeenAt": "2026-04-01T10:00:00.000Z"
    }
  ],
  "issuedAt": "2026-04-01T09:30:00.000Z",
  "expiresAt": null,
  "notes": null,
  "metadata": {
    "source": "manual"
  },
  "createdAt": "2026-04-01T09:30:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z"
}
```

### Field notes

- `id`: internal immutable record id
- `licenseKey`: primary activation input for the current minimal flow
- `redemptionCode`: reserved optional field for future issuance/redeem workflows
- `status`: minimal values should be `ACTIVE`, `BLOCKED`, `EXPIRED`
- `plan`: minimal business label such as `LIFETIME` or `YEARLY`
- `maxDevices`: fixed at `3` for this contract
- `activatedDevices`: server-side source of truth for device occupancy
- `issuedAt`: license issuance timestamp
- `expiresAt`: nullable for non-expiring plans
- `notes`: optional operator notes
- `metadata`: optional machine-readable extension field
- `createdAt` / `updatedAt`: record lifecycle timestamps

---

## 2. Activation Contract

Current minimal rule:

- request is keyed by `licenseKey`
- server decides whether `deviceId` is already present
- duplicate same-device activation is idempotent success
- new device is allowed until the 3rd device
- 4th device is rejected

### POST `/api/license/activate`

### Request

```json
{
  "licenseKey": "VP-ABCD-EFGH-IJKL",
  "deviceId": "LL-8QW12ER45TYU"
}
```

### Success response

```json
{
  "ok": true,
  "result": "ACTIVATED",
  "license": {
    "id": "lic_01JX8P7Q6M0M7P0K4W4L6Q9A1B",
    "status": "ACTIVE",
    "plan": "LIFETIME",
    "maxDevices": 3,
    "usedDevices": 2,
    "remainingDevices": 1,
    "expiresAt": null
  },
  "device": {
    "deviceId": "LL-8QW12ER45TYU",
    "activationStatus": "NEW_DEVICE"
  }
}
```

### Duplicate same-device idempotent response

```json
{
  "ok": true,
  "result": "ALREADY_ACTIVATED",
  "license": {
    "id": "lic_01JX8P7Q6M0M7P0K4W4L6Q9A1B",
    "status": "ACTIVE",
    "plan": "LIFETIME",
    "maxDevices": 3,
    "usedDevices": 2,
    "remainingDevices": 1,
    "expiresAt": null
  },
  "device": {
    "deviceId": "LL-8QW12ER45TYU",
    "activationStatus": "EXISTING_DEVICE"
  }
}
```

### 4th device rejected response

```json
{
  "ok": false,
  "error": "DEVICE_LIMIT_REACHED",
  "license": {
    "id": "lic_01JX8P7Q6M0M7P0K4W4L6Q9A1B",
    "status": "ACTIVE",
    "plan": "LIFETIME",
    "maxDevices": 3,
    "usedDevices": 3,
    "remainingDevices": 0,
    "expiresAt": null
  },
  "device": {
    "deviceId": "LL-NEWDEVICE1234"
  }
}
```

---

## 3. Activation Rules

### Same-device idempotency

- If the incoming `deviceId` is already present in `activatedDevices`, activation returns success.
- It must not create a duplicate device entry.
- It must not consume an additional device slot.

### Device limit

- New device activations are allowed while `activatedDevices.length < 3`.
- The 3rd distinct device is allowed.
- The 4th distinct device is rejected.

### Status gating

- `ACTIVE`: may activate subject to device rules
- `BLOCKED`: activation rejected
- `EXPIRED`: activation rejected

### Scope boundary

- These rules apply only to server-side commercial license records.
- They do not change the existing trial baseline.
- They do not change trial token issuance, trial validation, or trial trust boundaries.

---

## 4. No-UI Admin Approach

Current phase recommendation:

- use server routes plus JSON/KV/DB-backed records
- do not build an admin page yet
- support manual inspection and manual operator actions first

Minimum operator capabilities for this phase:

- lookup a license record
- block a license
- unblock a license
- reset the activated device list

This is enough to support controlled rollout and support handling before any admin UI exists.

---

## 5. API Draft

Only the smallest operational interface is defined here.

### POST `/api/license/activate`

Purpose:

- activate a `licenseKey` for a `deviceId`
- idempotent for same-device reactivation

### POST `/api/license/block`

Example request:

```json
{
  "licenseKey": "VP-ABCD-EFGH-IJKL",
  "reason": "MANUAL_SUPPORT_BLOCK"
}
```

### POST `/api/license/unblock`

Example request:

```json
{
  "licenseKey": "VP-ABCD-EFGH-IJKL",
  "reason": "MANUAL_SUPPORT_UNBLOCK"
}
```

### POST `/api/license/reset-devices`

Example request:

```json
{
  "licenseKey": "VP-ABCD-EFGH-IJKL",
  "reason": "MANUAL_DEVICE_RESET"
}
```

Effect:

- clears `activatedDevices`
- keeps the license record itself intact

### GET `/api/license/:key`

Purpose:

- minimal support lookup
- returns record summary for manual inspection

Returned fields should be limited to:

- `id`
- `licenseKey`
- `status`
- `plan`
- `maxDevices`
- `activatedDevices`
- `issuedAt`
- `expiresAt`
- `createdAt`
- `updatedAt`

---

## 6. Minimal Storage Direction

This phase does not require a large system design.

Recommended minimal direction:

- start with one server-side record store
- use JSON/KV/Blob/DB storage depending on current deployment fit
- keep one record per `licenseKey`
- keep `activatedDevices` embedded in the record at first

This keeps the implementation small and defers normalization, dashboards, and issuance automation.
