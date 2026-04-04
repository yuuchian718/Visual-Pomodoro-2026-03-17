# Minimal Issuance Adapter Plan

## 1. Goal

This plan defines the smallest executable bridge between:

- a completed commercial purchase / activation case
- the existing formal license token issuance path

The problem it solves is simple:

- commercial activation currently proves eligibility
- but eligibility alone does not unlock the app

Yes, a customer who has purchased can be unlocked without waiting for trial to end.

The current practical way to do that is:

- purchase is confirmed
- commercial activation is completed
- operator reviews the case
- operator issues the existing formal license token manually
- customer pastes the token into the existing license token field
- app unlocks through the existing formal license baseline

So “purchase after trial started” does not need to wait for the 7-day trial to expire. The unlock can happen as soon as the formal license token is issued for the validated device.

---

## 2. Current State

Current facts:

- commercial activation only proves server-side eligibility
- the app’s actual unlock still depends on the existing formal license token baseline
- commercial activation does not directly unlock the app

Current fastest path is:

- purchase
- activation
- operator review
- manual formal token issuance
- customer pastes token
- unlock

This is already enough to support “buy now, unlock as soon as support approves,” without changing the first-layer trial system.

---

## 3. Minimal Issuance Adapter Responsibility

The issuance adapter should have a very small role.

It should:

- not change token format
- not change the existing formal license baseline
- not change the first-layer trial baseline
- only connect a validated commercial case to the formal token issuance action

In the current phase, the adapter does not need to be a full automated code module.

It can first exist as:

- an operator workflow rule
- a documented issuance decision point
- a minimal handoff step between lookup/activation review and formal token generation

In plain terms:

- commercial layer decides “eligible or not”
- formal license layer still produces the unlock artifact
- issuance adapter is the bridge between those two steps

---

## 4. Fastest Unlock Flow

Shortest operational flow:

1. customer purchases
2. customer enters `licenseKey`
3. customer triggers commercial activation with current `deviceId`
4. operator looks up the commercial license record
5. operator checks status and device occupancy
6. if the case is eligible, operator issues the existing formal license token for that device
7. customer pastes the formal license token into the app
8. app unlocks through the existing formal license validation flow

The step that avoids “waiting for trial to end” is step 6.

Once the customer has purchased and the case is validated, the operator may issue the formal license token immediately. Trial expiration is not a prerequisite.

---

## 5. Minimum Eligibility Conditions

### Formal token may be issued when:

- commercial license record exists
- record status is `ACTIVE`
- current device state is acceptable
- the customer device is already represented or has been support-approved
- there is no unresolved support block

### Formal token must not be issued when:

- commercial record does not exist
- record status is `BLOCKED`
- record status is `EXPIRED`
- device state is unclear
- a new 4th device is being requested and no support-approved reset has occurred

### Same-device repeated activation

- treat as idempotent continuation
- do not consume another device slot
- if record is still `ACTIVE`, this case can proceed to formal token issuance review

### 4th device

- do not issue a formal token automatically
- operator must first decide whether this is a valid replacement-device case
- if not approved, no token should be issued

### Replacement device

- operator reviews the case
- if approved, `reset-devices` can be used
- after reset and valid re-activation state, formal token issuance may proceed

---

## 6. Smallest Future Automation Extension Points

Keep future automation narrow.

### 1. Issuance adapter server action

- a small server-side action that accepts an already validated commercial case
- calls the existing formal token generation path
- returns or records issuance result

### 2. Issuance tracking

- a small issuance record for:
  - issuedAt
  - issuedForDeviceId
  - issuedBy
  - caseId

### 3. Automated delivery later

- after issuance is stable, delivery may later be automated
- this should happen only after the issuance decision and tracking path are stable

---

## 7. One-Line Conclusion

The minimal issuance adapter for Visual Pomodoro is not a new licensing system: it is simply the smallest bridge that lets a validated commercial purchase move quickly into the existing formal token unlock path, so customers can be unlocked without waiting for trial to end.
