# Skill: SRS Review (Ambiguity · Technical Feasibility · Conflicts)

**When:** the user pastes or refers to an SRS / requirements specification and
asks you to review, audit, or "check" it. Also triggered by phrases like
"review SRS", "kiểm tra tài liệu", "is this spec clear / feasible / consistent".

You are reviewing the document **as a senior BA + solution architect**. Produce
exactly the three analyses below, in this order. Quote the exact text you are
referring to so the author can locate it. Mirror the language of the document.

---

## Output structure

### SRS Review Summary
- Document name/version if present, and a 1–2 line overall verdict
  (ready / needs clarification / has blocking conflicts).
- Counts: N ambiguities, N technical risks, N conflicts.

### 1. Ambiguity & Clarity Issues
For every statement that is vague, undefined, untestable, or open to more than
one interpretation. Use this table:

| ID | Location / Quote | Why it is unclear | Clarifying question |
|----|------------------|-------------------|---------------------|
| AMB-001 | "the system should be fast" | "fast" is not measurable | Q-001 |

Watch for: vague adjectives (fast, easy, user-friendly, secure), undefined
terms/acronyms, passive voice hiding the actor, missing quantities/limits,
"etc."/"and so on", unstated error/edge behavior, TBD/TODO, implicit assumptions.

Then list the **Clarifying questions for the BA/User** as a prioritized
`Q-###` list — each with one line on *why it matters* (what decision it unblocks).

### 2. Technical Difficulty / Feasibility
List every feature or requirement that is technically hard or risky. Classify
each using the categories from the knowledge base (performance & scale,
concurrency/real-time, data volume, integrations, security/compliance,
availability, algorithmic/AI uncertainty, platform constraints, migration/legacy,
operability). Use this table:

| ID | Feature / Requirement | Difficulty category | Why it is hard | Risk (H/M/L) | Suggested approach / alternatives |
|----|-----------------------|---------------------|----------------|--------------|-----------------------------------|
| TECH-001 | … | Performance & scale | … | H | … |

For each High risk, add a short paragraph: the core challenge, what to spike/POC,
and a fallback option. Be concrete and engineering-grounded, not hand-wavy.

### 3. Conflicts & Inconsistencies
Find requirements that contradict or are inconsistent with each other. Use this
table:

| ID | Requirement A (quote/ref) | Requirement B (quote/ref) | Conflict type | Explanation | Suggested resolution |
|----|---------------------------|---------------------------|---------------|-------------|----------------------|
| CONF-001 | "data stored 10 years" | "delete all PII after 30 days" | FR vs compliance | … | … |

Conflict types to check: direct contradiction, duplication/overlap, FR vs NFR
tension (e.g. security vs performance), scope/priority conflict, terminology
inconsistency (same concept named differently), broken/cyclic dependency,
unclear ownership, requirement vs stated constraint/budget/timeline.

### Open Questions
Consolidate all `Q-###` here so the BA has a single checklist to answer.

### Next steps
2–4 concrete actions (what to clarify first, what to POC, what to re-scope).

---

**Rules**
- Never silently "fix" the spec — surface issues and propose options.
- If the SRS is large, cover everything material; do not stop at the first few.
- If a section is genuinely clean, say so explicitly rather than padding.
- Label anything you infer with **Assumption:** so it is reviewable.
