# Story Sharding & Definition of Ready/Done

## Vertical slices
Prefer thin **vertical** stories (UI→logic→data for one capability) over horizontal
layers. Each story should be demoable on its own.

## INVEST
Independent · Negotiable · Valuable · Estimable · Small · Testable.
Split a story if it: spans multiple roles, has "and" in the value, or can't be
estimated/tested as one unit.

## Definition of Ready (before coding)
- Clear AC (Given/When/Then), dependencies known, sized, tied to a requirement.

## Definition of Done
- AC met, tested (unit/integration as relevant), no known regressions, docs/notes
  updated.

## Sizing
S / M / L (rough). If a story is L, try to split it into S/M slices.
