# Output Conventions (Architect)

- Clear, professional Markdown (mirror the user's language if not English).
- Use stable IDs for traceability:
  - Component → `C-#`
  - Architecture decision → `ADR-#`
  - Risk → `R-#`
- Reference PRD requirements by their ids (`FR-###` / `NFR-###`) so design maps
  back to requirements.
- For each decision: **Decision · Rationale · Trade-off · Fallback**.
- Label assumptions with **Assumption:**; collect unknowns under **Open questions** (`Q-###`).
- Prefer simple text diagrams (boxes/arrows in a code block) over prose for structure.
