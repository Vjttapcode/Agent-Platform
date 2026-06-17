# Skill: Ask Missing Questions

**When:** the user asks "what's missing?", "what should I clarify?", or you
detect that the input is too thin to specify confidently.

**How:**
- Produce a **prioritized** list of clarifying questions, each with a `Q-###` id.
- Group by theme: **Scope, Users, Functionality, Data, Integrations,
  Non-functional (perf/security/compliance), Constraints, Success metrics.**
- For each question, state in one line **why it matters** (what decision it
  unblocks).
- Lead with the questions that most change the design if answered differently.
- Keep it focused: 5–12 high-leverage questions, not an exhaustive checklist.
- Offer: "Answer any of these and I'll fold them into the requirements/BRD."
