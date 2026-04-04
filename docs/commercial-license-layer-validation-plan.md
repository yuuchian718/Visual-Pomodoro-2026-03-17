# Commercial License Layer Validation Plan

## 1. Goal

This validation plan is for checking whether the current second-layer commercial license capability is operationally usable.

It is meant to verify:

- the current commercial activation path
- the current device-limit rules
- the current issuance record flow
- the current manual unlock bridge into the existing formal license baseline

This validation should happen before treating the current implementation as a reusable base template.

Reason:

- the current layer is already functionally connected
- but it still needs explicit operator and end-to-end validation
- reuse should only happen after the current flow is proven stable in real support-style operation

---

## 2. Current Validation Scope

The current validation scope includes:

- commercial activation
- 3-device rule
- issuance record create / lookup
- caseId lookup
- front-end commercial license key submission and result display
- the shortest unlock path for “purchase -> manual formal token issuance -> unlock”

This validation scope does not include:

- Etsy automation
- admin UI
- auto delivery
- full reporting

---

## 3. Validation Modes

### Single Interface / Single Function Validation

Use this mode to validate one API or one rule at a time.

Examples:

- activation result is correct
- issuance record is written correctly
- caseId lookup returns the expected `issuanceIds`

### End-to-End Manual Flow Validation

Use this mode to validate the real operator workflow from customer input to final unlock.

Examples:

- customer enters commercial license key
- operator reviews activation result
- operator manually issues formal token
- customer pastes token
- app unlocks

---

## 4. Minimal Validation Checklist

The following scenarios should be validated at minimum.

### Commercial Activation Rules

- same-device repeated activation
- 3rd device allowed
- 4th device rejected
- `BLOCKED` rejected
- `EXPIRED` rejected

### Issuance Record Flow

- issuance record can be created
- issuanceId lookup can return one issuance record summary
- caseId lookup can return related `issuanceIds`

### Front-End Submission

- front-end commercial license key submission shows the correct result
- front-end can show:
  - `ACTIVATED`
  - `ALREADY_ACTIVATED`
  - `LICENSE_NOT_FOUND`
  - `LICENSE_BLOCKED`
  - `LICENSE_EXPIRED`
  - `DEVICE_LIMIT_REACHED`

### Manual Unlock Bridge

- after purchase and valid activation review, operator can manually issue formal token
- customer can unlock after pasting the formal token
- customer does not need to wait for the 7-day trial to end before unlocking

---

## 5. What To Record For Each Check

Each validation item should record at least:

- input
- expected result
- actual result
- pass / fail
- notes

Recommended recording format:

- Input: what key, device, case, or operator action was used
- Expected Result: what should happen
- Actual Result: what actually happened
- Pass / Fail: final judgment
- Notes: short explanation for mismatch or follow-up

---

## 6. Pass Criteria

The current commercial license layer may be considered basically usable when all of the following are true:

- core activation rules behave correctly
- issuance record create / lookup works reliably
- caseId lookup works reliably for related issuance ids
- front-end commercial key submission shows correct operator-facing results
- manual formal token issuance can reliably unlock the app after purchase
- unlock can happen before trial expiry when purchase has been validated

The current layer should not yet be treated as a reusable base template when any of the following is true:

- activation rules are still inconsistent
- issuance tracking is incomplete or unreliable
- operator flow still depends on undocumented steps
- front-end result display is misleading
- manual unlock path is not repeatable

---

## 7. One-Line Conclusion

This layer should be considered “basically reusable” only after both API-level checks and the full manual purchase-to-unlock workflow have been verified as stable, repeatable, and operator-friendly.
