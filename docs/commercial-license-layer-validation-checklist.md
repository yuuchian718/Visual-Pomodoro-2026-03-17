# Commercial License Layer Validation Checklist

## Usage

This checklist is for human operators or internal testers validating the current second-layer commercial license flow.

Use it as a direct execution sheet:

1. fill in `Input` and `Expected Result` before running the check
2. run the validation step
3. fill in `Actual Result`
4. mark `Pass / Fail`
5. add short `Notes` if anything is unclear, failed, or needs follow-up

Use one row per validation item.

If the same scenario is validated more than once, add a new row copy instead of overwriting the old result.

One-line execution note:

- this checklist is for proving the current commercial license layer is operationally usable before treating it as a reusable base

---

## Checklist Table

| ID | Scenario | Input | Expected Result | Actual Result | Pass / Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CLV-01 | same-device repeated activation | License key: ___ ; Device ID: ___ ; same device already activated | Activation is accepted as same-device continuation; no extra device slot issue |  |  |  |
| CLV-02 | 3rd device allowed | License key: ___ ; Device ID: ___ ; this is the 3rd distinct device | Activation succeeds; 3rd device is allowed |  |  |  |
| CLV-03 | 4th device rejected | License key: ___ ; Device ID: ___ ; 3 devices already activated | Activation is rejected with device-limit result |  |  |  |
| CLV-04 | `BLOCKED` rejected | License key: ___ ; blocked record ; Device ID: ___ | Activation is rejected because license is blocked |  |  |  |
| CLV-05 | `EXPIRED` rejected | License key: ___ ; expired record ; Device ID: ___ | Activation is rejected because license is expired |  |  |  |
| CLV-06 | issuance record create | Issuance input: issuanceId ___ ; caseId ___ ; deviceId ___ | Issuance record is created successfully |  |  |  |
| CLV-07 | issuanceId lookup | issuanceId: ___ | Single issuance record summary is returned |  |  |  |
| CLV-08 | caseId lookup | caseId: ___ | Related `issuanceIds` are returned |  |  |  |
| CLV-09 | front-end commercial key result display | Front-end input: commercial license key ___ ; device path ___ | UI shows the correct activation result text |  |  |  |
| CLV-10 | purchase -> manual formal token issuance -> unlock | Purchase confirmed ; activation reviewed ; formal token manually issued ; token pasted into app | Customer can unlock through the existing formal license path |  |  |  |
| CLV-11 | unlock before 7-day trial expiry | Active trial not yet expired ; purchase confirmed ; formal token manually issued | Customer can unlock without waiting for trial expiry |  |  |  |

---

## Suggested Fill Order

- Fill `Input` first.
- Fill `Expected Result` before running the check.
- After running the check, fill `Actual Result`.
- Then mark `Pass / Fail`.
- Use `Notes` only for useful follow-up information, mismatch explanation, or retry context.

---

## Minimum Recording Rule

For every validation item, make sure the row clearly shows:

- what was tested
- what should have happened
- what actually happened
- whether it passed
- what needs follow-up, if any
