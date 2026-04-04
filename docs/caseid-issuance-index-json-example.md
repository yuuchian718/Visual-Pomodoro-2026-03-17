# CaseId Issuance Index JSON Example

## 1. Goal

This document provides a minimal JSON reference for a future `caseId -> issuanceIds` index record.

It exists to:

- align field names before implementation
- keep the future case index store small and predictable
- separate index data from full issuance record data

Defining the JSON examples first helps later implementation stay narrow and avoids drifting into a broader search or reporting system too early.

---

## 2. Minimal JSON Structure Examples

### Example A: One Issuance Record Under One Case

```json
{
  "caseId": "VP-SUPPORT-2026-0402-0001",
  "issuanceIds": [
    "iss_20260402_0001"
  ],
  "createdAt": "2026-04-02T09:10:00.000Z",
  "updatedAt": "2026-04-02T09:10:00.000Z"
}
```

### Example B: Multiple Issuance Records Under One Case

```json
{
  "caseId": "VP-SUPPORT-2026-0402-0002",
  "issuanceIds": [
    "iss_20260402_0002",
    "iss_20260402_0003",
    "iss_20260402_0004"
  ],
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T11:30:00.000Z"
}
```

---

## 3. Suggested Fields

The minimum JSON shape should include:

- `caseId`
- `issuanceIds`
- `createdAt`
- `updatedAt`

No extra field is required at this stage.

Reason:

- this record is only a minimal index
- the detailed issuance data already belongs in the issuance record store
- adding more metadata too early would push this beyond the current smallest useful scope

---

## 4. Field Notes

- `caseId`  
  Required. The support case identifier used as the index key.

- `issuanceIds`  
  Required. Array of issuance record ids related to this support case.

- `createdAt`  
  Required. Timestamp for when this case index record was first created.

- `updatedAt`  
  Required. Timestamp for when this case index record was last updated.

### `issuanceIds` Rules

- Empty state: should be represented as `[]` only if a record is intentionally created before any issuance record exists
- Single record: should still be represented as an array, for example `["iss_20260402_0001"]`
- Multiple records: should remain a flat array of issuance ids

For the current minimal direction, the safer default is:

- do not create a case index record until there is at least one issuance record id to store

---

## 5. Usage Boundaries

- This is an index record, not a full issuance record.
- It does not replace the single issuance record store.
- It must not store the formal token body.
- It should not be expanded into a report, dashboard, or general admin list system at this stage.

---

## 6. One-Line Conclusion

This JSON example is the field-alignment reference for any future `caseId -> issuanceIds` index store, so implementation can stay minimal, explicit, and separate from the full issuance record data.
