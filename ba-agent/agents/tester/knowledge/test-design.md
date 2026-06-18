# Test Design Reference

## Test types
- **Functional** — does it meet the acceptance criteria?
- **Alternate / negative** — wrong input, unauthorized, missing data.
- **Edge / boundary** — empty, max, min, off-by-one, concurrency.
- **Non-functional** — performance, security, accessibility, reliability.

## Coverage technique
- Derive at least one case per acceptance criterion (happy path).
- Add negative + boundary cases for inputs and state transitions.
- Equivalence partitioning + boundary-value analysis for ranges.

## Risk-based prioritization
Prioritize by **impact × likelihood of failure**. Test the highest-risk,
highest-value flows first; mark each case Priority High/Med/Low.

## Good test case
Atomic, independent, repeatable, with explicit Given/When/Then and a single clear
expected result.
