# e-Menu Engineering Documentation & Decision Governance

This directory is the canonical home for architecture decision records (`docs/adr/`), design specifications (`docs/specs/`), and executable implementation plans (`docs/plans/`) for **e-Menu (حلويات عبمبر الزروق)**.

---

## Document Types & When to Write Them

| Document | Path Convention | When to Write | Gate / Review Requirement |
|---|---|---|---|
| **Design Spec** | `docs/specs/YYYY-MM-DD-<topic>-design.md` | Before any non-trivial feature, security/resilience change, or architectural refactor | **Builder Check** (fresh read-only review) + explicit approval before coding |
| **Implementation Plan** | `docs/plans/YYYY-MM-DD-<topic>.md` | Immediately after a design spec is approved, before editing production code | **5-Point Self-Review** + `## Review Focus` edge cases pinned by tests |
| **Architecture Decision Record (ADR)** | `docs/adr/NNNN-<title>.md` | Whenever making or formalizing a significant, hard-to-reverse architectural, data, or stack decision | Status tracked as `Proposed`, `Accepted`, or `Superseded` |

---

## 1. Design Specifications (`docs/specs/`)

**Naming:** `docs/specs/YYYY-MM-DD-<topic>-design.md`

Every project-scale design spec should cover:

1. **Intent & Why:** Problem statement, operational context, and success criteria.
2. **Goals, Non-Goals & Anti-Goals:** Explicit boundaries—including *anti-goals* (conditions that make the change fail even if it technically compiles or passes unit tests, such as breaking Render deploy compatibility or mutating live MongoDB/PocketBase collections).
3. **Constraints:** Runtime, deployment (Render `render.yaml` / `e-menu-secrets`), backward compatibility, and accessibility constraints.
4. **Approaches & Selected Design:** Viable options considered, tradeoffs, selected architecture, and labeled engineering calls.
5. **Contracts & Verification Strategy:** Concrete API/error schemas, security boundaries, accessibility gates, and exact test/verification commands.
6. **Builder Check:** Before handing off a project-scale spec to planning, run a fresh read-only review asking: *"What missing decisions would force a builder to guess and materially change what gets built?"* Triage every gap as already answered in the repo, a minor labeled call, or an open question for the maintainer.

---

## 2. Implementation Plans (`docs/plans/`)

**Naming:** `docs/plans/YYYY-MM-DD-<topic>.md`

Every implementation plan must follow the `writing-plans` structure:

- **Header:** `Goal`, `Architecture` (2–3 sentences), `Tech Stack`, and `Spec` link.
- **`## File Map`:** Exhaustive list of files to `Create`, `Modify`, `Delete`, and `Test`, each with a single clear responsibility.
- **`## Global Constraints`:** Spec-wide invariants copied verbatim so every task inherits them.
- **`## Review Focus`:** Up to **5 highest-risk implied inputs or failure modes** not fully spelled out in the spec, ordered most likely first—each paired with a pinning test in its owning task.
- **TDD Task Blocks (`### Task N: ...`):**
  - Exact `Files:` (`Create:`, `Modify:`, `Test:`)
  - Exact `Interfaces:` (`Consumes:` and `Produces:` symbol signatures)
  - 5 concrete checkbox steps per task:
    1. Write the failing test (exact test names and assertions)
    2. Run the test to verify expected failure
    3. Implement minimal code matching the signature and spec
    4. Run the test to verify pass
    5. Commit the focused unit of work

### Mandatory 5-Point Plan Self-Review

Before executing or handing off any plan, verify inline:

1. **Spec Coverage:** Every goal, constraint, and requirement in the spec maps to at least one concrete task.
2. **Step Scan:** Every step lets an engineer write *exactly one reasonable thing* (zero `"TBD"` / `"handle edge cases"` gaps and zero bloated boilerplate transcripts).
3. **Type & Signature Consistency:** Symbol names, parameters, and return shapes in `Produces` match every downstream `Consumes` and test assertion.
4. **Review Focus Audit:** Every failure mode in `## Review Focus` has a concrete pinning test wired into its owning task.
5. **Proportion Check:** Plan length is proportionate to the spec rather than duplicating full source files.

---

## 3. Architecture Decision Records (`docs/adr/`)

**Naming:** `docs/adr/NNNN-<title>.md` (zero-padded 4-digit sequence, lowercase kebab-case)

Use the lightweight ADR format:

```markdown
# ADR NNNN: [Short Title]

- **Status:** Proposed | Accepted | Superseded
- **Date:** YYYY-MM-DD

## Context
## Decision
## Alternatives Considered
## Consequences (Positive / Tradeoffs & Risks)
```

Never overwrite historical ADRs silently; when an architectural decision changes, author a new ADR and mark the previous one `Superseded by ADR NNNN`.

---

## Design System & Operational Source-of-Truth Hierarchy

- **Design Tokens:** [`frontend/src/tokens/tokens.json`](../frontend/src/tokens/tokens.json) -> compiled via `npm run tokens:build` ([`scripts/build-tokens.js`](../scripts/build-tokens.js)) into `tokens.css` and `tokens.js`, mirrored in [`design-system/e-menu/MASTER.md`](../design-system/e-menu/MASTER.md).
- **Workspace Skills:** Project-specific agent skills live under `.agents/skills/` (kept concise under 500 lines per `SKILL.md` and aligned with e-Menu's actual Vue 3 + Express + MongoDB + PocketBase stack).

---

## Current Index

### Architecture Decision Records
- [ADR 0001: Multi-Tenant MongoDB Databases and PocketBase Inventory Sync](adr/0001-multi-tenant-db-and-pocketbase.md) (`Accepted`)
- [ADR 0002: Incremental Vertical-Slice Backend Modularization](adr/0002-backend-modularization.md) (`Proposed`)
- [ADR 0003: Vue 3 + W3C DTCG Design System and Brand Skill Governance](adr/0003-vue-dtcg-design-system.md) (`Accepted`)

### Design Specifications
- [2026-11-20: e-Menu Hardening and Hygiene Design](specs/2026-11-20-emenu-hardening-and-hygiene-design.md)

### Implementation Plans
- [2026-11-20: Phase 0 Hardening & Phase 4 Hygiene Implementation Plan](plans/2026-11-20-phase-0-and-4-plan.md)
