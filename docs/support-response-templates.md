# Support Response Templates

## Usage

This document provides copy-ready support reply templates for the current Visual Pomodoro commercial license support flow.

Use these templates only after:

- reviewing the commercial license record
- checking the current device occupancy state
- following the operator runbook

Do not send these replies before lookup and support review are complete.

---

## Tone

All customer-facing replies should be:

- concise
- polite
- clear
- operationally accurate

Do not:

- promise automation that does not exist
- imply instant unlock if manual review is still required
- describe internal system behavior beyond what the customer needs
- promise a formal license token unless support has approved it

---

## 1. Activation Succeeded But App Is Still Not Unlocked

### Internal use note

Use when:

- commercial activation has succeeded
- customer expects immediate unlock
- no formal license token has been manually issued yet

Do not imply that commercial activation alone unlocks the app.

### Customer-facing reply

```text
Thanks — your commercial activation has been recorded successfully.

At the moment, activation confirmation and app unlock are handled as two separate steps. Your activation shows that your license is registered correctly, but the app still requires the formal license token step to complete unlock.

We’re reviewing your record now and will confirm the next step shortly.
```

---

## 2. Same-Device Repeated Activation

### Internal use note

Use when:

- customer `deviceId` already exists in the commercial license record
- activation is effectively idempotent
- no extra device slot was consumed

### Customer-facing reply

```text
Your current device is already registered on this license, so no additional device slot was used.

There’s no problem with repeating activation on the same device. If you still cannot access the app, we’ll continue checking the unlock step for this device.
```

---

## 3. 4th Device Was Rejected

### Internal use note

Use when:

- customer is trying to activate a new 4th device
- current record already has 3 distinct activated devices

Do not promise immediate approval.

### Customer-facing reply

```text
This license has already reached its current device limit, so the new device could not be activated automatically.

If this is a replacement-device case, please reply and let us know. We can review it manually and confirm whether a device reset is appropriate.
```

---

## 4. Customer Changed Devices And Needs Manual Review

### Internal use note

Use when:

- customer reports a replacement device
- support review is still needed before `reset-devices`
- no final approval has been made yet

### Customer-facing reply

```text
Thanks for the update. We understand that you’re trying to use a replacement device.

This type of request needs a quick manual review before we make any device changes on the license. We’re checking the record now and will follow up with the next step once that review is complete.
```

---

## 5. License Is Blocked

### Internal use note

Use when:

- commercial record status is `BLOCKED`
- support should not issue a formal license token

Do not expose unnecessary internal detail.

### Customer-facing reply

```text
We checked the license record and it is currently not available for activation or unlock handling.

At this stage we’re unable to proceed with unlock for this license. If you believe this is unexpected, please reply and we can review the case further.
```

---

## 6. Record Does Not Exist

### Internal use note

Use when:

- lookup returns no matching commercial license record
- support must not issue a formal license token

Ask the customer to reconfirm key details.

### Customer-facing reply

```text
We weren’t able to find a matching license record with the information provided.

Please reply with the exact license key you used, and if possible include the device ID shown in the app. Once we have those details, we can check again.
```

---

## 7. Formal License Token Has Been Sent Manually

### Internal use note

Use only when:

- support review is complete
- manual issuance has been approved
- formal license token has already been generated and sent

### Customer-facing reply

```text
We’ve now sent your formal license token.

Please paste that token into the existing license field in the app and save it on the same device you registered. Once that token is accepted, the app should unlock normally on that device.
```

---

## 8. Need Customer To Provide License Key / Device ID

### Internal use note

Use when:

- customer request is incomplete
- support cannot safely review the case without both fields

### Customer-facing reply

```text
To check this for you, we need two details:

1. your license key
2. the device ID currently shown in the app

Please send both, and we’ll review the record from there.
```

---

## Reminder For Operators

Before sending any customer-facing reply:

- confirm the template matches the actual record state
- do not promise immediate unlock unless formal token issuance has already been approved
- keep wording consistent with the operator runbook
