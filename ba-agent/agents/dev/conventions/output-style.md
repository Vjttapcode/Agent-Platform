# Output & ID Conventions (Dev)

- Clear Markdown (mirror the user's language if not English).
- IDs: story `US-###`, task `T-###.#` (task # within a story), acceptance `AC-###`.
- Story block format:
  > **US-001** — As a `<role>`, I want `<capability>`, so that `<benefit>`.
  > _Satisfies:_ FR-001 · _Components:_ C-2 · _Size:_ S · _Depends on:_ —
  > **Tasks:** T-001.1 … / **AC:** AC-001 …
- Label inferred decisions with **Assumption:**; unknowns under **Open questions** (`Q-###`).
- Order stories by build sequence; note blockers explicitly.
