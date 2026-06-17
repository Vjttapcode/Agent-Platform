# Technical Feasibility — Risk Taxonomy & Scoring

Use this framework to classify and rate technical difficulty in a spec, so the
analysis is systematic rather than ad-hoc.

## Difficulty categories
1. **Performance & scale** — high throughput, large user counts, low latency
   targets (e.g. p95 < 200ms), heavy queries.
2. **Concurrency & real-time** — live updates, websockets, race conditions,
   ordering/consistency guarantees, sub-second sync.
3. **Data volume & storage** — very large datasets, retention rules, search over
   big corpora, analytics/aggregation.
4. **Integrations / third-party** — external APIs, rate limits, unreliable or
   undocumented partners, vendor lock-in, webhooks.
5. **Security & compliance** — auth/authz complexity, encryption, PII/PCI/HIPAA,
   GDPR, audit trails, data residency.
6. **Availability & reliability** — high uptime SLAs, failover, disaster
   recovery, idempotency, exactly-once semantics.
7. **Algorithmic / AI-ML uncertainty** — ranking, recommendations, NLP, accuracy
   targets that cannot be guaranteed up front; needs experimentation.
8. **Platform & device constraints** — offline mode, low-end devices, browser
   support, cross-platform, hardware/IoT.
9. **Migration & legacy** — data migration, backward compatibility, integrating
   with old systems, zero-downtime cutover.
10. **Operability & observability** — deployment, monitoring, on-call, cost at
    scale, multi-region.

## Risk scoring
Rate each risky item on two axes, then combine:

- **Likelihood of difficulty** (will it actually be hard?) — Low / Med / High
- **Impact if it goes wrong** (schedule/cost/UX) — Low / Med / High

| Likelihood \ Impact | Low | Med | High |
|---------------------|-----|-----|------|
| **High**            | M   | H   | H    |
| **Med**             | L   | M   | H    |
| **Low**             | L   | L   | M    |

## For each High risk, recommend
- A **spike / POC** to de-risk before committing.
- A **fallback / simpler alternative** if the ideal solution proves infeasible.
- The **assumptions** that, if false, change the estimate.
