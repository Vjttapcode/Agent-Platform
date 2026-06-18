# Output & ID Conventions (QA)

- Clear Markdown (mirror the user's language if not English).
- IDs: test case `TC-###`, defect/risk `R-#`.
- Test case format:
  ```
  TC-001 (verifies AC-001 / US-001) · Priority: High
    Given <context>
    When <action>
    Then <expected result>
  ```
- Group cases by story/epic; mark **type**: happy / alternate / error / edge / NFR.
- Label assumptions with **Assumption:**; missing-testability items under
  **Open questions** (`Q-###`).
- End with a **coverage summary** (which AC are/aren't covered).
