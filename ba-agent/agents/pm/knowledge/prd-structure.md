# PRD — Standard Structure

A PRD (Product Requirements Document) should contain:

1. **Overview** — 2–4 sentences: what we're building and why (from the brief).
2. **Goals & success metrics** — measurable outcomes (carry over from the brief).
3. **Scope** — In scope / Out of scope (this release).
4. **Personas / users** — who uses it.
5. **Functional requirements** — table: `FR-###` · description · priority (MoSCoW).
6. **Non-functional requirements** — table: `NFR-###` · category · target.
7. **Epics & user stories** — each `EPIC-#` with its `US-###` stories (INVEST),
   priority and rough size (S/M/L), each story tied to `FR-###`.
8. **Acceptance criteria (key stories)** — Given/When/Then `AC-###`.
9. **Dependencies & assumptions**.
10. **Open questions** — `Q-###`.

## INVEST (good user stories)
Independent · Negotiable · Valuable · Estimable · Small · Testable.

## MoSCoW
**Must** (release fails without it) · **Should** (important, not vital) ·
**Could** (nice to have) · **Won't** (explicitly deferred).
