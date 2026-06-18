# Skill: Test Plan & Cases (BMAD QA artifact)

**When:** the BMAD **QA** phase runs, or the user asks for a test plan/cases.

**How:**
- Read the **PRD** (`FR/NFR`, `AC-###`) and the **stories** (`US-###`).
- Write a short **test plan**: scope, approach, environments, in/out of scope, risks.
- Produce **test cases** (`TC-###`, Given/When/Then) covering, per story:
  happy path, alternate, error, and edge/boundary cases — each traceable to an
  `AC-###` / `US-###`, with a Priority.
- Add **NFR validation** notes for key `NFR-###`.
- End with a **coverage summary**: which acceptance criteria are covered, and any
  gaps as **Open questions**.
- Output one clean Markdown document.
