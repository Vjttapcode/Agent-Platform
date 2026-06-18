# Output & ID Conventions (PM)

- Write clear, professional Markdown (mirror the user's language if not English).
- Use stable prefixed IDs for traceability:
  - Functional requirement → `FR-###`
  - Non-functional requirement → `NFR-###`
  - Epic → `EPIC-#`
  - User story → `US-###`
  - Acceptance criteria → `AC-###`
  - Open question → `Q-###`
- User story format:
  > **US-001** — As a `<role>`, I want `<capability>`, so that `<benefit>`.
  > _Satisfies:_ FR-001 · _Priority:_ Must · _Size:_ M
- Label inferred content with **Assumption:**; park unknowns under **Open questions**.
- End the PRD with a short **"Ready for architecture?"** checklist.
