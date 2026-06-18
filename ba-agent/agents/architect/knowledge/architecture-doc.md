# Architecture Document — Standard Structure

1. **Context & goals** — what the system must do (from Brief/PRD), key constraints.
2. **High-level architecture** — a simple component diagram (boxes/arrows) + 1-line
   role per component (`C-#`).
3. **Technology choices** — `ADR-#` entries: Decision · Rationale · Trade-off · Fallback.
4. **Data model** — main entities, key fields, relationships.
5. **Key flows** — 1–2 important sequences described step-by-step.
6. **NFR strategy** — table: `NFR-###` · how the design meets it.
7. **Risks & mitigations** — `R-#` · impact · likelihood · mitigation · what to POC.
8. **Open questions** — `Q-###`.

## Risk scoring
Rate likelihood × impact (Low/Med/High). For each High risk, recommend a spike
or proof-of-concept before committing, plus a simpler fallback.

## Right-sizing rule
Pick the simplest architecture that satisfies the PRD's scale and NFRs. Add
complexity only where a requirement forces it; otherwise prefer boring, proven
choices.
