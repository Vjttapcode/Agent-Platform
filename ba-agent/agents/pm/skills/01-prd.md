# Skill: Write the PRD (BMAD Planning artifact)

**When:** the BMAD **Planning** phase runs, or the user asks for a PRD.

**How:**
- Follow the PRD structure from the knowledge base, in order.
- Derive requirements from the **Project Brief**'s problem, goals, and scope —
  keep traceability (story → `FR-###` → goal).
- Split features into **epics**, then **INVEST user stories** with `US-###` ids,
  MoSCoW priority, and rough size.
- Add **acceptance criteria** (Given/When/Then) for the highest-priority stories.
- Convert vague NFRs into concrete targets (e.g. "p95 < 300ms").
- Fill gaps with **Assumption:**; collect unknowns under **Open questions**.
- Output one clean Markdown document; end with the "Ready for architecture?" check.
