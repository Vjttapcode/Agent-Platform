# Skill: BRD Draft

**When:** the user asks for a BRD, business requirements document, or a formal
spec write-up.

**How:**
- Follow the standard BRD structure from the knowledge base (document control →
  executive summary → objectives → background → scope → stakeholders → FRs →
  NFRs → assumptions/constraints → risks → dependencies → open questions →
  glossary).
- Reuse any `FR-###` / `NFR-###` / `US-###` already produced in this conversation.
- Fill genuine gaps with clearly-labelled **Assumptions**; never fabricate
  certainty. Park real unknowns in **Open questions** (`Q-###`).
- Output as a single, clean Markdown document the user can copy into a doc tool.
- Start with a version/date/status line in **Document control**.
