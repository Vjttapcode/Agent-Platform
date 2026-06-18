# Skill: Shard into Stories (BMAD Implementation artifact)

**When:** the BMAD **Implementation** phase runs, or the user asks to break a
PRD/architecture into stories.

**How:**
- Read the **PRD** (epics, `FR-###`, priorities) and **architecture** (`C-#`, ADRs).
- Produce an **ordered** list of INVEST stories (`US-###`) grouped by epic, each with:
  tasks (`T-###.#`), acceptance criteria (`AC-###`), size, dependencies, and the
  components/requirements it touches.
- Respect MoSCoW: schedule **Must** stories first; defer **Could/Won't**.
- Call out **spikes** for anything the architecture flagged as risky/unknown.
- End with a short **build sequence** summary.
- Output one clean Markdown document.
