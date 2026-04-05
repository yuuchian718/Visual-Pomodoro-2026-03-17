# Commercial Certificate Claim Backend V1

> Legacy note: this document describes the older `claimToken + email` claim flow. The current customer-facing path now uses the shared public-link instant issuance flow; this file is kept only for compatibility-chain and historical reference.

## What Changed

This change adds the smallest public backend claim flow for commercial certificate retrieval.

The new flow is:

1. customer opens a PDF claim link
2. customer submits:
   - `claimToken`
   - `email`
3. backend validates the token and email
4. backend records the claim
5. backend returns the `commercialCertificate`

This change does not add:

- a front-end claim page
- order number handling
- operator UI
- changes to the existing Visual Pomodoro unlock logic

---

## Files Changed

### Added

- `netlify/functions/commercial-certificate-claim.mjs`
- `netlify/functions/lib/commercial-certificate-claim-store.mjs`
- `tests/commercialCertificateClaim.test.mjs`

---

## What Each File Does

### `netlify/functions/lib/commercial-certificate-claim-store.mjs`

Adds a very thin Blob-backed store for claim records.

Minimum stored fields:

- `claimToken`
- `email`
- `commercialCertificate`
- `claimedAt`
- `claimStatus`

Current minimal rules:

- `claimToken` must be non-empty
- `commercialCertificate` must be non-empty
- `email` may be `null` before claim, but must be valid if present
- `claimedAt` may be `null` before claim, but must be valid if present
- `claimStatus` is currently kept minimal as `ISSUED`

### `netlify/functions/commercial-certificate-claim.mjs`

Adds the smallest public claim function.

Route:

- `POST /.netlify/functions/commercial-certificate-claim`

Input:

- `claimToken`
- `email`

Behavior:

1. validates request shape
2. validates email
3. looks up the claim token
4. saves claim email and timestamp
5. returns the `commercialCertificate`

Success response:

```json
{
  "ok": true,
  "commercialCertificate": "VP-TEST-ACTIVE-EMPTY",
  "email": "user@example.com"
}
```

Failure responses:

```json
{
  "ok": false,
  "code": "INVALID_REQUEST"
}
```

```json
{
  "ok": false,
  "code": "INVALID_EMAIL"
}
```

```json
{
  "ok": false,
  "code": "NOT_FOUND"
}
```

### `tests/commercialCertificateClaim.test.mjs`

Adds the minimum automated coverage for:

- valid `claimToken + email`
- invalid `claimToken`
- empty or invalid email

---

## Why This Is The Minimum Change

This implementation is intentionally narrow.

It only solves:

- `claimToken + email -> save claim -> return commercialCertificate`

It does not expose:

- full issuance records
- operator-only issuance routes
- payment metadata
- order numbers

It keeps the public claim surface separate from:

- operator issuance handling
- the existing app unlock flow

This means:

- PDF link is still only the commercial certificate retrieval entry
- Visual Pomodoro Settings remains the place where that certificate is entered
- the existing automatic formal token issuance flow remains unchanged

---

## Risks

- this version assumes a valid claim record already exists for the incoming `claimToken`
- this version stores the latest claim email for that token and does not yet add a separate claim-history model
- this version does not add claim-rate limiting or additional anti-abuse checks
- this version does not add a customer-facing HTML claim page yet

These are acceptable for the current smallest backend-only phase.

---

## Manual Validation

### 1. Seed one claim record in the claim store

Before using the public route, create one claim record in the testing store with:

```json
{
  "claimToken": "claim_vp_test_0001",
  "email": null,
  "commercialCertificate": "VP-TEST-ACTIVE-EMPTY",
  "claimedAt": null,
  "claimStatus": "ISSUED"
}
```

### 2. Call the public claim route

```bash
curl -i -X POST "http://localhost:8888/.netlify/functions/commercial-certificate-claim" \
  -H "Content-Type: application/json" \
  -d '{"claimToken":"claim_vp_test_0001","email":"user@example.com"}'
```

Expected result:

```json
{
  "ok": true,
  "commercialCertificate": "VP-TEST-ACTIVE-EMPTY",
  "email": "user@example.com"
}
```

### 3. Validate invalid token

```bash
curl -i -X POST "http://localhost:8888/.netlify/functions/commercial-certificate-claim" \
  -H "Content-Type: application/json" \
  -d '{"claimToken":"claim_missing","email":"user@example.com"}'
```

Expected result:

```json
{
  "ok": false,
  "code": "NOT_FOUND"
}
```

### 4. Validate invalid email

```bash
curl -i -X POST "http://localhost:8888/.netlify/functions/commercial-certificate-claim" \
  -H "Content-Type: application/json" \
  -d '{"claimToken":"claim_vp_test_0001","email":"not-an-email"}'
```

Expected result:

```json
{
  "ok": false,
  "code": "INVALID_EMAIL"
}
```

---

## Test Commands

```bash
node --test tests/commercialCertificateClaim.test.mjs
node --check netlify/functions/commercial-certificate-claim.mjs
node --check netlify/functions/lib/commercial-certificate-claim-store.mjs
```
