# Operator API Examples

## Scope

This document provides direct operator API call examples for the current Visual Pomodoro commercial license support flow.

It covers operator-only commercial license routes for:

- lookup
- block
- unblock
- reset-devices
- issuance-record-create
- issuance-record-lookup
- issuance-records-by-case

It does not cover:

- trial routes
- formal license token generation
- Etsy automation
- admin UI
- code changes

---

## Before You Use These Endpoints

These routes are operator-only / protected routes.

Use them only after:

- confirming the support case requires manual operator action
- reviewing the operator runbook
- verifying that you are using the correct target environment

Do not use these endpoints casually in public or customer-facing contexts.

---

## Environment Variables

Typical shell setup:

```bash
export SITE_URL="https://your-site.example.com"
export OPERATOR_SECRET="your-operator-secret"
export LICENSE_KEY="VP-ABCD-EFGH-IJKL"
export ISSUANCE_ID="iss_20260402_0001"
```

For local development, for example:

```bash
export SITE_URL="http://localhost:8888"
export OPERATOR_SECRET="your-local-operator-secret"
export LICENSE_KEY="VP-ABCD-EFGH-IJKL"
export ISSUANCE_ID="iss_20260402_0001"
```

---

## How Operator Secret Is Passed

Preferred method:

- send operator secret in the header:
  - `x-license-operator-secret`

Example:

```bash
-H "x-license-operator-secret: $OPERATOR_SECRET"
```

Current implementation also supports secret in JSON body for POST routes, but header-based usage is preferred.

---

## 1. Lookup

### Purpose

- inspect the commercial license record before taking support action

### cURL Example

```bash
curl -X GET "$SITE_URL/.netlify/functions/license-lookup?licenseKey=$LICENSE_KEY" \
  -H "x-license-operator-secret: $OPERATOR_SECRET"
```

### Example Success Response

```json
{
  "ok": true,
  "license": {
    "id": "lic_01JX8P7Q6M0M7P0K4W4L6Q9A1B",
    "licenseKey": "VP-ABCD-EFGH-IJKL",
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
    "createdAt": "2026-04-01T09:30:00.000Z",
    "updatedAt": "2026-04-01T10:00:00.000Z"
  }
}
```

### Example Error Response

```json
{
  "ok": false,
  "error": "LICENSE_NOT_FOUND"
}
```

---

## 2. Block

### Purpose

- prevent further normal commercial handling for a license record

### cURL Example

```bash
curl -X POST "$SITE_URL/.netlify/functions/license-block" \
  -H "Content-Type: application/json" \
  -H "x-license-operator-secret: $OPERATOR_SECRET" \
  -d "{
    \"licenseKey\": \"$LICENSE_KEY\",
    \"reason\": \"MANUAL_SUPPORT_BLOCK\"
  }"
```

### Example Success Response

```json
{
  "ok": true,
  "record": {
    "id": "lic_01JX8P7Q6M0M7P0K4W4L6Q9A1B",
    "licenseKey": "VP-ABCD-EFGH-IJKL",
    "status": "BLOCKED",
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
    "createdAt": "2026-04-01T09:30:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z"
  }
}
```

### Example Error Response

```json
{
  "ok": false,
  "error": "LICENSE_NOT_FOUND"
}
```

---

## 3. Unblock

### Purpose

- restore a blocked commercial license record to normal active handling

### cURL Example

```bash
curl -X POST "$SITE_URL/.netlify/functions/license-unblock" \
  -H "Content-Type: application/json" \
  -H "x-license-operator-secret: $OPERATOR_SECRET" \
  -d "{
    \"licenseKey\": \"$LICENSE_KEY\",
    \"reason\": \"MANUAL_SUPPORT_UNBLOCK\"
  }"
```

### Example Success Response

```json
{
  "ok": true,
  "record": {
    "id": "lic_01JX8P7Q6M0M7P0K4W4L6Q9A1B",
    "licenseKey": "VP-ABCD-EFGH-IJKL",
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
    "createdAt": "2026-04-01T09:30:00.000Z",
    "updatedAt": "2026-04-02T08:05:00.000Z"
  }
}
```

### Example Error Response

```json
{
  "ok": false,
  "error": "LICENSE_NOT_FOUND"
}
```

---

## 4. Reset Devices

### Purpose

- clear activated device occupancy while keeping the license record

### cURL Example

```bash
curl -X POST "$SITE_URL/.netlify/functions/license-reset-devices" \
  -H "Content-Type: application/json" \
  -H "x-license-operator-secret: $OPERATOR_SECRET" \
  -d "{
    \"licenseKey\": \"$LICENSE_KEY\",
    \"reason\": \"MANUAL_DEVICE_RESET\"
  }"
```

### Example Success Response

```json
{
  "ok": true,
  "record": {
    "id": "lic_01JX8P7Q6M0M7P0K4W4L6Q9A1B",
    "licenseKey": "VP-ABCD-EFGH-IJKL",
    "status": "ACTIVE",
    "plan": "LIFETIME",
    "maxDevices": 3,
    "activatedDevices": [],
    "issuedAt": "2026-04-01T09:30:00.000Z",
    "expiresAt": null,
    "createdAt": "2026-04-01T09:30:00.000Z",
    "updatedAt": "2026-04-02T08:10:00.000Z"
  }
}
```

### Example Error Response

```json
{
  "ok": false,
  "error": "LICENSE_NOT_FOUND"
}
```

---

## 5. Issuance Record Create

### Purpose

- write one operator-confirmed issuance record

### cURL Example

```bash
curl -X POST "$SITE_URL/.netlify/functions/issuance-record-create" \
  -H "Content-Type: application/json" \
  -H "x-license-operator-secret: $OPERATOR_SECRET" \
  -d "{
    \"issuanceId\": \"$ISSUANCE_ID\",
    \"caseId\": \"VP-SUPPORT-2026-0402-0001\",
    \"handledAt\": \"2026-04-02T09:10:00.000Z\",
    \"operatorName\": \"Alice Chen\",
    \"licenseKey\": \"$LICENSE_KEY\",
    \"deviceId\": \"LL-8QW12ER45TYU\",
    \"commercialRecordStatus\": \"ACTIVE\",
    \"actionTaken\": \"ISSUED_FORMAL_TOKEN\",
    \"whetherFormalTokenIssued\": \"YES\",
    \"issuedTokenForDeviceId\": \"LL-8QW12ER45TYU\",
    \"issuedAt\": \"2026-04-02T09:10:00.000Z\",
    \"issuanceResult\": \"ISSUED\",
    \"customerReplySent\": \"YES\",
    \"notes\": \"Lookup completed first.\"
  }"
```

### Example Success Response

```json
{
  "ok": true,
  "record": {
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
    "notes": "Lookup completed first."
  },
  "summary": {
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
    "customerReplySent": "YES"
  }
}
```

### Example Error Response

```json
{
  "ok": false,
  "error": "ISSUANCE_RECORD_ALREADY_EXISTS"
}
```

---

## 6. Issuance Record Lookup

### Purpose

- fetch one issuance record by `issuanceId`

### cURL Example

```bash
curl -X GET "$SITE_URL/.netlify/functions/issuance-record-lookup?issuanceId=$ISSUANCE_ID" \
  -H "x-license-operator-secret: $OPERATOR_SECRET"
```

### Example Success Response

```json
{
  "ok": true,
  "summary": {
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
    "customerReplySent": "YES"
  }
}
```

### Example Error Response

```json
{
  "ok": false,
  "error": "ISSUANCE_RECORD_NOT_FOUND"
}
```

---

## 7. Issuance Records By Case

### Purpose

- fetch issuance record ids related to one `caseId`

### cURL Example

```bash
curl -X GET "$SITE_URL/.netlify/functions/issuance-records-by-case?caseId=VP-SUPPORT-2026-0402-0201" \
  -H "x-license-operator-secret: $OPERATOR_SECRET"
```

### Example Success Response

```json
{
  "ok": true,
  "caseId": "VP-SUPPORT-2026-0402-0201",
  "issuanceIds": [
    "iss_20260402_0201",
    "iss_20260402_0202"
  ]
}
```

### Example Error Response

```json
{
  "ok": false,
  "error": "ISSUANCE_CASE_INDEX_NOT_FOUND"
}
```

---

## Common Error Meanings

### `OPERATOR_SECRET_MISSING`

Meaning:

- server-side operator secret is not configured in the environment

Action:

- stop and fix environment configuration before continuing

### `OPERATOR_SECRET_REQUIRED`

Meaning:

- request did not include an operator secret

Action:

- resend the request with `x-license-operator-secret`

### `OPERATOR_SECRET_INVALID`

Meaning:

- operator secret was provided but does not match server configuration

Action:

- verify you are using the correct secret for the target environment

### `INVALID_JSON_BODY`

Meaning:

- POST request body is malformed JSON

Action:

- fix quoting / escaping and resend valid JSON

### `INVALID_REQUEST`

Meaning:

- required input such as `licenseKey` is missing or empty

Action:

- verify request payload and resend

### `LICENSE_NOT_FOUND`

Meaning:

- no commercial license record exists for the provided key

Action:

- verify `licenseKey`
- if still missing, handle as a record mismatch case

### `ISSUANCE_RECORD_ALREADY_EXISTS`

Meaning:

- a record with the same `issuanceId` already exists

Action:

- verify that the same issuance decision is not being submitted twice
- use a new `issuanceId` only when it is truly a new record

### `ISSUANCE_RECORD_NOT_FOUND`

Meaning:

- no issuance record exists for the provided `issuanceId`

Action:

- verify `issuanceId`
- if still missing, treat it as a missing issuance-tracking record

### `ISSUANCE_CASE_INDEX_NOT_FOUND`

Meaning:

- no case index record exists for the provided `caseId`

Action:

- verify `caseId`
- if still missing, treat it as a missing issuance case-index record

---

## Safety Notes

- Do not share the operator secret in customer-facing channels.
- Do not paste the operator secret into screenshots, tickets, or public docs.
- Do not expose these routes in public support flows.
- These routes are operator-only / protected routes and should be treated accordingly.
