# Mode: oferta — Full Evaluation A-G (Consultancy)

When the user pastes a JD (text or URL), deliver ALL 7 blocks (A-F evaluation + G legitimacy) with roster-wide scoring.

## Paso 0 — Fetch & Archetype Detection (shared)

1. **Fetch JD** via Playwright (`browser_navigate` + `browser_snapshot`). Fallback: WebFetch. Save snapshot to `jds/{company-slug}-{role-slug}-{date}.md`.
2. **Classify archetype** from the 6 types in `_shared.md` (or hybrid of 2). This determines how to frame each consultant's match.
3. **Re-eval check:** Scan `reports/` for an existing report whose `**URL:**` normalizes to the same key. If found → re-evaluation flow (update in place, keep original `###`).

## Block A — Role Summary (shared, computed once)

Table with:
- Detected archetype
- Domain (platform/agentic/LLMOps/ML/enterprise)
- Function (build/consult/manage/deploy)
- Seniority
- Remote (full/hybrid/onsite)
- Team size (if mentioned)
- TL;DR in 1 sentence

## Roster Scoring Loop — Mini Block B

Read `config/firm.yml` for shortlist policy. Then for **each** consultant in `consultants/*/profile.yml`:

1. Read their `cv.md`, `article-digest.md` (if exists), `_profile.md` (if exists), `profile.yml`
2. **Location eligibility check first** (see `_shared.md` → "Location Eligibility"): compare JD's required location/work-auth against the consultant's `location.country` and `visa_status`. If hard blocker → ceiling score at 1.0, rationale = "ineligible: location mismatch ({reason})".
3. Otherwise, score against the JD using the same 1-5 rubric as full Block B, but **abbreviated**: score + one-line rationale only. Apply soft-signal adjustments for location if applicable.
4. Collect results into array: `{slug, score, rationale}`

**Output:** Shortlist ranking table (all consultants, sorted by score):

| Rank | Consultant | Score | Rationale | Verdict |
|------|------------|-------|-----------|---------|
| 1 | alice | 4.6 | Strong LLMOps background, direct eval framework experience | PITCH |
| 2 | bob | 4.1 | Good platform skills, lacks agent orchestration depth | PITCH |
| 3 | carol | 3.2 | Frontend focus, minimal AI infrastructure overlap | SKIP |

**Hybrid shortlist rule** (from `config/firm.yml`):
- Top 1 always shortlisted (unless below `shortlist.min_score` floor OR flagged as location-ineligible)
- All others scoring ≥ `shortlist.threshold` (default 4.0) also shortlisted
- Consultants below threshold get verdict `SKIP (below threshold)`
- Location-ineligible consultants get verdict `SKIP (location mismatch)` regardless of other scores
- If `shortlist.min_score` is set and even top-1 is below → "No consultants met minimum threshold — manual review required"
- **If ALL consultants are location-ineligible** → empty shortlist, report title notes "LOCATION MISMATCH: no consultant eligible to work in {region}". Skip Blocks B/C/E/F/PDFs/tracker rows.

## Per-Consultant Evaluation (only for shortlisted consultants)

For each PITCH consultant, generate full blocks B, C, E, F using **that consultant's** files:

### Block B — CV Match

Read `consultants/{slug}/cv.md`. Map each JD requirement to exact lines from their CV.

**Archetype-adapted:**
- FDE → prioritize fast delivery and client-facing proof points
- SA → prioritize system design and integrations
- PM → prioritize product discovery and metrics
- LLMOps → prioritize evals, observability, pipelines
- Agentic → prioritize multi-agent, HITL, orchestration
- Transformation → prioritize change management, adoption, scaling

**Gaps** section with mitigation strategy for each gap:
1. Hard blocker or nice-to-have?
2. Can this consultant demonstrate adjacent experience?
3. Is there a portfolio project that covers this gap?
4. Concrete mitigation plan (cover letter phrase, quick project, etc.)

### Block C — Level & Strategy

1. **Level detected** in JD vs **consultant's natural level for this archetype**
2. **"Sell senior without lying" plan**: specific phrases adapted to archetype, concrete achievements to highlight
3. **"If downleveled" plan**: accept if comp is fair, negotiate 6-month review, clear promotion criteria

### Block E — CV Customization Plan

| # | Section | Current state | Proposed change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |

Top 5 CV changes + Top 5 LinkedIn changes to maximize match for this consultant.

### Block F — Interview Plan

6-10 STAR+R stories mapped to JD requirements:

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |

**Story Bank:** Check `consultants/{slug}/story-bank.md`. Append new stories whose title slug isn't already present.

**Archetype-framed:**
- FDE → emphasize delivery speed and client-facing
- SA → emphasize architecture decisions
- PM → emphasize discovery and trade-offs
- LLMOps → emphasize metrics, evals, production hardening
- Agentic → emphasize orchestration, error handling, HITL
- Transformation → emphasize adoption, organizational change

Also include:
- 1 recommended case study (which project to present and how)
- Red-flag questions and how to answer them

## Block D — Comp & Demand (shared, computed once)

Use WebSearch for:
- Current salaries for the role (Glassdoor, Levels.fyi, Blind)
- Company compensation reputation
- Role demand trends

Table with data and cited sources. If no data available, say so rather than inventing.

Compare against each shortlisted consultant's `compensation.target_range` from their `profile.yml`.

## Block G — Posting Legitimacy (shared, computed once)

Analyze the job posting for signals that indicate whether this is a real, active opening. See `_shared.md` for the full signal taxonomy, tiers, and ethical framing.

Output: tier assessment + signals table + context notes.

---

## Post-Evaluation

**ALWAYS** after generating blocks A-G:

### 1. Save report .md

Save to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = next sequential number (3-digit, zero-padded). For re-evals, keep the original `###`.
- Re-evals: add `**Last re-evaluated:** YYYY-MM-DD` to header; keep original `**Date:**`.

**Report format:**

```markdown
# Evaluation: {Company} — {Role}

**Date:** {YYYY-MM-DD}
**URL:** {url}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**Shortlist:** {slug1}, {slug2}
**PDFs:** output/cv-{slug1}-{company}-{date}.pdf, output/cv-{slug2}-...

---

## Shortlist (Hybrid: top 1 + score >= {threshold})

| Rank | Consultant | Score | Verdict |
|------|------------|-------|---------|
| 1 | alice | 4.6 | PITCH |
| 2 | bob | 4.1 | PITCH |
| 3 | carol | 3.2 | SKIP (below threshold) |

## A) Role Summary
(shared content)

## D) Comp & Demand
(shared content)

## G) Posting Legitimacy
(shared content)

## Per-Consultant Evaluations

### alice (4.6/5 — PITCH)
#### B) CV Match
(alice-specific content)
#### C) Level & Strategy
(alice-specific content)
#### E) CV Customization Plan
(alice-specific content)
#### F) Interview Plan (STAR+R)
(alice-specific content)

### bob (4.1/5 — PITCH)
#### B) CV Match
(bob-specific content)
...

## Keywords
(15-20 JD keywords for ATS optimization)
```

### 2. Register in tracker

For **each** shortlisted consultant, write one TSV to `batch/tracker-additions/{num}-{candidate-slug}.tsv`:

```
{num}\t{date}\t{company}\t{role}\t{slug}\tEvaluated\t{score}/5\t❌\t[{num}](reports/{num}-{company-slug}-{date}.md)\t{note}
```

Then run `node merge-tracker.mjs` to incorporate into `data/applications.md`.

**Re-eval behavior:**
- Shortlisted consultant already has a row → update score, preserve status, prepend note `Re-eval YYYY-MM-DD (oldScore→newScore)`
- New consultant now above threshold → new row added
- Consultant dropped below threshold → existing row preserved, note appended

### 3. Update story banks

For each shortlisted consultant, append new STAR+R stories from Block F to `consultants/{slug}/story-bank.md` (only if story title slug not already present).
