# Skill: Acceptance Criteria

**When:** the user asks for acceptance criteria, "definition of done", or test
conditions for a story/feature.

**How:**
- Default to **Gherkin** and assign an `AC-###` id tied to its story:
  ```
  AC-001 (US-001)
    Given <context>
    When <action>
    Then <expected outcome>
  ```
- Cover **happy path, alternate paths, and error/edge cases** — not just the
  sunny day.
- Keep each criterion atomic and independently testable.
- Stay implementation-agnostic (describe behavior, not code).
- If a story is missing, ask for it or restate the assumed story first.
