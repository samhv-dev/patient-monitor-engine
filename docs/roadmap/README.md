# Roadmap

| Line | What it is | State |
|---|---|---|
| **v1.0** | The teaching simulator: patient monitor, instructor app, ventilator view, lumped physiology with drugs, fluids, reflexes and devices. | Feature work merged; hardening, calibration and release remain. See [v1.0-remaining.md](v1.0-remaining.md). |
| **v1.x** | Maintenance only: defect fixes, calibration corrections, documentation. No new physiology is patched onto the v1 core. | After v1.0. |
| **v2.0** | A physiological and pathophysiological simulation engine: one declared state, conservation by construction, mechanistic links with measurable parameters, control hubs, predictive validation. | Specification phase. See [v2.0/](v2.0/README.md). |

There is no v1.1 feature release. Items once listed for v1.1 (paediatric and obstetric physiology, laboratory values,
coagulation) move to v2.0, where they are built on the new core rather than added to the old one. The fourth v1.1 item,
**networked second screens, shipped in v1.0** as Stage 12 (merged 2026-10-12, PR #57): learners' phones follow the
instructor's monitor over a classroom relay on the instructor's laptop (the kit's "Start Classroom"), read-only.

Decided by the project owner on 2026-10-05; the reasoning and the record of decisions are in
[v2.0/DECISIONS.md](v2.0/DECISIONS.md).
