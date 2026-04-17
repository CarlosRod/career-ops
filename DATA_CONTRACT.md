# Data Contract

This document defines which files belong to the **system** (auto-updatable) and which belong to the **user** (never touched by updates).

## User Layer

These files contain firm and consultant data, customizations, and work product.

> **Note:** This fork has no automatic update mechanism (Decision 6a — hard fork). The User/System distinction is retained for documentation clarity but is not enforced by any process.

| File | Purpose |
|------|---------|
| `config/firm.yml` | Firm identity, shortlist policy, comp floor |
| `consultants/*/cv.md` | Per-consultant CV in markdown |
| `consultants/*/profile.yml` | Per-consultant identity, targets, comp range |
| `consultants/*/_profile.md` | Per-consultant archetypes, narrative overrides |
| `consultants/*/article-digest.md` | Per-consultant proof points from portfolio |
| `consultants/*/story-bank.md` | Per-consultant accumulated STAR+R stories |
| `modes/_profile.md` | Firm-level negotiation scripts, location policy |
| `portals.yml` | Customized company list |
| `data/applications.md` | Application tracker (10-column, includes Candidate) |
| `data/pipeline.md` | URL inbox |
| `data/scan-history.tsv` | Scan history |
| `data/follow-ups.md` | Follow-up history |
| `reports/*` | Evaluation reports |
| `output/*` | Generated PDFs |
| `jds/*` | Saved job descriptions |

## System Layer

These files contain system logic, scripts, templates, and instructions.

| File | Purpose |
|------|---------|
| `modes/_shared.md` | Scoring system, global rules, tools |
| `modes/oferta.md` | Evaluation mode instructions |
| `modes/pdf.md` | PDF generation instructions |
| `modes/scan.md` | Portal scanner instructions |
| `modes/batch.md` | Batch processing instructions |
| `modes/apply.md` | Application assistant instructions |
| `modes/auto-pipeline.md` | Auto-pipeline instructions |
| `modes/contacto.md` | LinkedIn outreach instructions |
| `modes/deep.md` | Research prompt instructions |
| `modes/ofertas.md` | Comparison instructions |
| `modes/pipeline.md` | Pipeline processing instructions |
| `modes/project.md` | Project evaluation instructions |
| `modes/tracker.md` | Tracker instructions |
| `modes/training.md` | Training evaluation instructions |
| `modes/patterns.md` | Pattern analysis instructions |
| `modes/followup.md` | Follow-up cadence instructions |
| `modes/de/*` | German language modes |
| `CLAUDE.md` | Agent instructions |
| `AGENTS.md` | Codex instructions |
| `*.mjs` | Utility scripts |
| `batch/batch-prompt.md` | Batch worker prompt |
| `batch/batch-runner.sh` | Batch orchestrator |
| `dashboard/*` | Go TUI dashboard |
| `templates/*` | Base templates |
| `fonts/*` | Self-hosted fonts |
| `.claude/skills/*` | Skill definitions |
| `docs/*` | Documentation |
| `VERSION` | Current version number |
| `DATA_CONTRACT.md` | This file |

## The Rule

**User Layer files contain firm/consultant data and customizations.** System Layer files contain shared logic. This distinction helps maintainers understand which files carry user state and should be handled carefully during refactors.
