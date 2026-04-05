# Commercial License Env-First Checklist

Check environment variables before changing licensing business logic.

## First Priority

1. variable exists
2. variable name is correct
3. variable is set in the correct Netlify scope
4. variable is set in the correct deploy context
5. secret value is complete
6. base64/key length is valid
7. public key and private key are not mixed up
8. formal keys and trial keys are not mixed up
9. any changed `VITE_*` variable was followed by a new frontend build and deploy

## Required Variables

### Public issue + hosted store

- `VISUAL_POMODORO_BLOBS_SITE_ID`
- `VISUAL_POMODORO_BLOBS_TOKEN`

### Formal token issue

- `KOTO_PRIVATE_KEY_B64`

### Frontend formal token validation

- `VITE_KOTO_PUBLIC_KEY_B64`

### Trial validation

- `VITE_KOTO_TRIAL_PUBLIC_KEY_B64`

## Real Failure Cases Already Seen

- `MissingBlobsEnvironmentError`
  - public issuance selected Blobs but hosted runtime did not have usable Blobs configuration
- `KOTO_PRIVATE_KEY_B64 must decode to at least 32 bytes`
  - formal signing key was missing or invalid
- activation returned a formal token but refresh still showed free/partial mode
  - frontend was missing `VITE_KOTO_PUBLIC_KEY_B64`, so the saved token could not be validated
- local `localhost:8888` activation returned `LICENSE_NOT_FOUND` for an online-issued certificate
  - local dev was not using the same data source as the hosted store

## Validation Order

1. `public-certificate-issue` succeeds
2. `license-activate-and-issue` returns `FORMAL_TOKEN_ISSUED`
3. browser localStorage contains `koto_license_token`
4. refresh still shows full licensed state

If step 4 fails, check `VITE_KOTO_PUBLIC_KEY_B64` before changing any entitlement logic.

## Local Dev vs Hosted Runtime

- Hosted runtime is the source of truth for hosted-issued commercial certificates.
- Local dev may use local JSON fallback for license-related stores.
- Do not mix a hosted-issued certificate with a local-dev activation path unless local dev is explicitly configured to target the same hosted store.
