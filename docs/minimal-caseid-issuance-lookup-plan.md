# Minimal CaseId Issuance Lookup Plan

## 1. Goal

This plan defines the smallest safe direction for looking up issuance records by `caseId`.

The problem it solves is:

- one support case may produce more than one issuance-related handling record
- operators may need to review those related records together
- current lookup by `issuanceId` is precise, but only works when the exact issuance record id is already known

So the difference is:

- `issuanceId` lookup is for one exact record
- `caseId` lookup is for finding related issuance records under the same support case

---

## 2. Current State

Current facts:

- `issuance-record-create` already exists
- `issuance-record-lookup` already exists and looks up by `issuanceId`
- there is currently no `caseId` lookup capability
- there is currently no list view, filtering, pagination, or UI for issuance records

This means current issuance tracking is usable for exact-record retrieval, but not yet for “show me what happened under this support case.”

---

## 3. Minimal Scope Boundary

The current problem to solve is narrow:

- can an operator retrieve issuance records related to one support case

This is not:

- a full admin backend
- a general search system
- a complex reporting layer
- a listing framework with filters and pagination

The goal is only to support a small operational question:

- “what issuance records exist for this case”

---

## 4. Minimal Options Comparison

### Option A: Keep only `issuanceId` lookup

How it works:

- do nothing new
- operators must already know the exact `issuanceId`

Advantages:

- zero implementation cost
- zero storage changes
- no new query surface

Risks:

- weak support flow when operators only know the `caseId`
- hard to review multiple issuance decisions under one case
- manual record tracing becomes slower over time

Assessment:

- safest from an implementation perspective
- weakest from an operator workflow perspective

### Option B: Add a minimal `caseId -> issuanceIds` mapping

How it works:

- when creating an issuance record, also maintain a very small index by `caseId`
- lookup by `caseId` returns the related `issuanceIds` or a small set of related issuance summaries

Advantages:

- fits the current minimal-store approach
- avoids scanning all issuance records
- keeps the query surface narrow and explicit
- best match for “minimal change with practical operator value”

Risks:

- adds a second write path that must stay in sync with issuance record creation
- requires a small index design instead of single-record-only storage

Assessment:

- strongest current fit for minimal operator value
- still small enough to avoid becoming a reporting system

### Option C: Scan all stored issuance records

How it works:

- read across all issuance records
- filter in memory by `caseId`

Advantages:

- no extra index structure

Risks:

- poor fit for Blob-style minimal storage
- does not scale cleanly
- turns a small operator feature into an implicit full-store scan
- harder to reason about operational cost and consistency

Assessment:

- not recommended for the current “small and stable” phase

---

## 5. Recommended Option

The recommended option is:

- Option B: a minimal `caseId -> issuanceIds` mapping

Why:

- it gives operators a useful next-step lookup without introducing a broad search system
- it stays aligned with the current minimal-store pattern
- it avoids the instability of full-store scanning
- it keeps future implementation narrow and predictable

This is the smallest approach that actually improves support workflow.

---

## 6. If Implemented Later, What Should The Smallest Scope Include

Minimum scope only:

- a very small case index store or case mapping record
- updated on issuance record creation
- one operator-only route such as:
  - `GET /.netlify/functions/issuance-records-by-case?caseId=...`
- response should stay small, for example:
  - `ok`
  - `caseId`
  - `issuanceIds`
  - or a small array of issuance summaries

It should still not include:

- pagination
- filters
- fuzzy search
- dashboards
- admin UI

That should remain out of scope until the current manual issuance workflow proves stable and frequent enough to justify more tooling.

---

## 7. One-Line Conclusion

The most stable next step for `caseId` issuance lookup is not a broad search system, but a very small `caseId -> issuanceIds` index that improves operator workflow without dragging the project into backend reporting or admin UI scope.
