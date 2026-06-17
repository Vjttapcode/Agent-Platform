# Artifact ID & Formatting Conventions

Use stable, prefixed IDs so artifacts can be cross-referenced (traceability).

| Artifact            | ID format | Example  |
| ------------------- | --------- | -------- |
| Requirement (func)  | `FR-###`  | `FR-001` |
| Requirement (non-f) | `NFR-###` | `NFR-001`|
| User Story          | `US-###`  | `US-001` |
| Acceptance Criteria | `AC-###`  | `AC-001` |
| Open Question       | `Q-###`   | `Q-001`  |

## User Story format

> **US-001** — As a `<role>`, I want `<capability>`, so that `<benefit>`.
> _Satisfies:_ FR-001, FR-003

## Acceptance Criteria format (Gherkin preferred)

```
AC-001 (US-001)
  Given <context>
  When <action>
  Then <expected outcome>
```

Use checklist-style criteria only when Given/When/Then does not fit.
