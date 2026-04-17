# Migration Plan — Single-Candidate → Consultancy

> **Status:** Not started.
> **Audience:** Maintainers implementing the fork's consultancy mode.
> **Scope:** Turn `career-ops` from a one-person job search into a multi-consultant matching engine that pitches 1 or N consultants per JD.

## 1. Context

The upstream `career-ops` assumes one candidate: one `cv.md`, one `profile.yml`, one `_profile.md`, one tracker row per JD. A boutique consultancy needs:

- A roster of consultants, each with their own CV, narrative, and archetypes.
- Per-JD evaluation that scores every consultant and shortlists good fits.
- Outputs (report, PDFs, tracker rows) that track each consultant's engagement with each role independently.

The change is structural (data model + tracker schema) but bounded — the scoring logic, scan pipeline, legitimacy assessment, and state taxonomy all stay as-is. The upstream update system is removed (hard fork — see Decision 6a).

## 2. Design decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Tracker row per `(JD × candidate)` | A consultancy's real pipeline unit is `(deal × consultant)`. Lets Alice=Interview and Bob=Rejected coexist cleanly. |
| 2 | Single report file per JD | Shared blocks (A/D/G) live once; per-consultant blocks (B/C/E/F) repeat inside. Cheaper and keeps the ranking view in one place. |
| 3 | Hybrid shortlist: top 1 always + others ≥ 4.0 | Guarantees one recommendation; only pitches a team when earned. Threshold is configurable in `firm.yml`. |
| 4 | Firm base + per-consultant overrides | Shared firm negotiation scripts/location policy in `modes/_profile.md`; per-consultant archetypes/narrative in `consultants/{slug}/_profile.md`. |
| 5 | Hard-cut migration, no backwards compat | One code path is easier to maintain. A one-shot migration script handles existing single-candidate setups. |
| 6a | Hard fork from upstream | This fork diverges permanently. `update-system.mjs` is removed. All files (CLAUDE.md, modes, scripts) are ours to modify freely. The System/User Layer distinction in DATA_CONTRACT.md becomes informational only. Trade-off: no automatic upstream fixes — cherry-pick manually if needed. |
| 7 | Mini Block B = abbreviated LLM prompt | Same scoring rubric as full Block B but asks for score + one-line rationale only per consultant. Context budget: ≤ 10 consultants × ~2-page CVs fits comfortably in one pass — no batching needed. |
| 8 | Story bank is per-consultant | `consultants/{slug}/story-bank.md`. Stories generated in Block F belong to the consultant they were written for; no shared attribution problem. |
| 9 | Comp floor in `firm.yml`; targets per-consultant | `firm.yml` holds the firm-wide negotiation floor (below which no offer is accepted regardless of consultant). Each consultant sets their own `compensation.target_range` and `compensation.minimum` in `consultants/{slug}/profile.yml`. |
| 10 | Optional `shortlist.min_score` in `firm.yml` | When set, a consultant below this floor is SKIP even if top-1; the shortlist can be empty, and the report shows "No consultants met minimum threshold — manual review required." Prevents confident recommendations for genuinely poor fits. |

## 3. Target layout

```
career-ops/
  config/
    firm.yml                        # NEW: firm identity, shortlist policy
    firm.example.yml                # NEW: template
  consultants/                      # NEW: roster root
    alice/
      cv.md
      profile.yml                   # personal: name, email, links, archetypes, comp
      _profile.md                   # optional: per-consultant overrides
      article-digest.md             # optional: proof points
      story-bank.md                 # optional: accumulated STAR+R stories (initialized empty on onboarding)
    bob/
      cv.md
      profile.yml
  modes/
    _profile.md                     # firm-level: shared negotiation, location policy
    _profile.template.md            # (updated to firm-level template)
    ...
  lib/
    normalize.mjs                   # NEW: shared normalizeCompany, roleMatch (Phase 2)
  migrate-to-consultancy.mjs        # NEW: one-shot migration
  docs/migration/
    plan.md                         # THIS FILE
    rollback.md                     # NEW: rollback instructions
```

Roster is discovered at runtime by scanning `consultants/*/profile.yml`. No index file.

## 4. Tracker schema change

### Markdown (`data/applications.md`)

```
| # | Date | Company | Role | Candidate | Score | Status | PDF | Report | Notes |
```

10 columns. New `Candidate` column inserted after `Role`. All existing columns keep their order relative to each other.

### TSV (`batch/tracker-additions/*.tsv`)

```
num \t date \t company \t role \t candidate \t status \t score \t pdf \t report \t notes
```

10 tab-separated columns. Status remains before score (matches the existing TSV-vs-markdown swap handled by `merge-tracker.mjs`).

### TSV file naming

Old convention: `{num}-{company-slug}.tsv` (one TSV per JD).
New convention: `{num}-{candidate-slug}.tsv` (one TSV per shortlisted consultant per JD). `{num}` is the report number — the same `###` in the report filename. Example: report `#047` with alice and bob shortlisted produces `047-alice.tsv` and `047-bob.tsv`, both linking to `reports/047-acme-2026-04-16.md`.

### Dedup key

From `(normalizeCompany, roleFuzzyMatch)` to `(normalizeCompany, roleFuzzyMatch, candidateSlug)`. Same role at same company can now produce up to N rows (one per shortlisted consultant) instead of being treated as a duplicate.

## 5. Report layout

Single file per JD at `reports/{###}-{company-slug}-{date}.md`.

```markdown
# Evaluation: {Company} — {Role}

**Date:** YYYY-MM-DD
**URL:** ...
**Legitimacy:** {tier}
**Shortlist:** {slug1}, {slug2}
**PDFs:** output/cv-{slug1}-{company}-{date}.pdf, output/cv-{slug2}-...

---

## Shortlist (Hybrid: top 1 + score ≥ 4.0)

| Rank | Consultant | Score | Verdict |
|------|------------|-------|---------|
| 1 | alice | 4.6 | PITCH |
| 2 | bob   | 4.1 | PITCH |
| 3 | carol | 3.2 | SKIP (below threshold) |

## A) Role Summary        (shared across consultants)
## D) Comp & Demand       (shared across consultants)
## G) Posting Legitimacy  (shared across consultants)

## Per-Consultant Evaluations

### Alice
  B) Match con CV
  C) Nivel y Estrategia
  E) Plan de Personalización
  F) Plan de Entrevistas (STAR+R)

### Bob
  B) Match con CV
  C) Nivel y Estrategia
  E) Plan de Personalización
  F) Plan de Entrevistas (STAR+R)
```

One tracker row per PITCH consultant, each linking to the same report file. One PDF per PITCH consultant.

## 6. Pipeline walkthrough — inputs, intermediates, final artifacts

This section traces a single JD from paste to filed rows, so the per-step outputs are explicit. It covers the three user-visible flows: **onboard**, **migrate**, and **evaluate a JD**. (Pitch/apply/follow-up reuse artifacts from these three.)

### 6.1 Onboarding (fresh install)

**Input:** user runs `/career-ops` in an empty install, provides firm identity and 1..N consultant CVs (pasted, uploaded, or linked).

| Step | Action | Artifact on disk |
|---|---|---|
| 1 | Collect firm identity | `config/firm.yml` |
| 2 | For each consultant: collect CV + personal fields | `consultants/{slug}/cv.md`, `consultants/{slug}/profile.yml` |
| 3 | For each consultant: optionally collect article digest | `consultants/{slug}/article-digest.md` |
| 4 | For each consultant: initialize empty story bank | `consultants/{slug}/story-bank.md` (header + empty body) |
| 5 | Seed firm-level profile template | `modes/_profile.md` (firm-level) |
| 6 | Initialize empty tracker | `data/applications.md` (header only, 10-col) |
| 7 | Optional: copy portals template | `portals.yml` |

**Final state:** a working `career-ops` install with a populated roster. No reports, no PDFs yet.

### 6.2 Migration (existing single-candidate install)

**Input:** user runs `node migrate-to-consultancy.mjs` against a repo that has root-level `cv.md` + `config/profile.yml`.

| Step | Action | Artifact on disk |
|---|---|---|
| 0 | **Pre-flight**: run `node doctor.mjs`; abort with `pre-flight failed — fix errors before migrating` if unhealthy | — |
| 1 | Back up originals | `.migration-backup/{YYYY-MM-DD-HHmm}/cv.md`, `.../profile.yml`, `.../_profile.md`, `.../article-digest.md` |
| 2 | Ask for a slug (default from name) | — |
| 3 | Move CV + digest into roster | `consultants/{slug}/cv.md`, `consultants/{slug}/article-digest.md` |
| 4 | Split profile.yml | `config/firm.yml` (firm fields: identity, shortlist policy, comp floor), `consultants/{slug}/profile.yml` (personal fields: archetypes, comp target, location, narrative) |
| 5 | Move per-person `_profile.md` | `consultants/{slug}/_profile.md` |
| 6 | Migrate story bank | `consultants/{slug}/story-bank.md` (move from `interview-prep/story-bank.md` if it exists; otherwise create empty file) |
| 7 | Rewrite root `_profile.md` to firm-level boilerplate | `modes/_profile.md` |
| 8 | Rewrite tracker header to 10-col; add `Candidate=<slug>` to existing rows | `data/applications.md` |
| 9 | Print rollback hint | stdout |

**Final state:** the existing user's data is preserved under one consultant slug; the new roster layout is live; a dated backup exists for rollback.

### 6.3 JD evaluation (the main user flow)

**Input:** user pastes a JD URL (or raw JD text).

| Step | Action | Transient (in-memory) | Persisted artifact |
|---|---|---|---|
| 1 | Fetch JD via Playwright (fallback: WebFetch) | JD text, URL, title | `jds/{company-slug}-{role-slug}-{date}.md` (raw JD snapshot; includes role slug to avoid collision when two roles at the same company are evaluated on the same day) |
| 2 | Detect archetype (shared) | archetype label | — |
| 3 | Build Block A — role summary (shared) | table | — |
| 4 | **Roster scoring loop**: for each `consultants/*/profile.yml`, read CV + digest + overrides; send an **abbreviated LLM prompt** (same criteria as full Block B, requesting only `score` + one-line rationale). If a `consultants/{slug}/` directory is missing `profile.yml` or it fails YAML parsing, **warn + skip** (log: `[roster] skipping {slug}: profile.yml missing or invalid`) and continue. ≤ 10 consultants × ~2-page CVs fits in one context window — no batching. | array of `{slug, score, rationale}` | — |
| 5 | Apply hybrid shortlist rule from `firm.yml` (top 1 + ≥ threshold) | `[slug1, slug2, ...]` | — |
| 6 | For each shortlisted consultant: full Block B (match), C (level), E (tailoring), F (STAR+R stories) | per-consultant blocks | — |
| 7 | Build Block D (comp) and Block G (legitimacy), shared | blocks | — |
| 8 | Write single JD report | — | **`reports/{###}-{company-slug}-{date}.md`** — shortlist ranking + A/D/G + per-consultant B/C/E/F |
| 9 | For each shortlisted slug: render HTML from template, inject JD keywords, run `generate-pdf.mjs` | per-consultant tailored HTML | **`output/cv-{slug}-{company-slug}-{date}.pdf`** (N files, one per shortlisted consultant) |
| 10 | For each shortlisted slug: write a 10-col TSV row pointing to the shared report | — | `batch/tracker-additions/{num}-{slug}.tsv` (pending); `{num}` is the report number from step 8 — the same `###` in the report filename |
| 11 | Merge pending TSVs (auto or via `node merge-tracker.mjs`) | — | **`data/applications.md`** gains N rows (one per shortlisted consultant, all linking the same report); processed TSVs move to `batch/tracker-additions/merged/` |
| 12 | For each shortlisted consultant: append Block F stories to their story bank | — | `consultants/{slug}/story-bank.md` updated (one file per shortlisted consultant); story ID = title slug |

**Final state for the user / firm**, after one JD:

- **1 report** (`reports/###-...md`) — internal analysis, the source of truth for the firm's eval.
- **N tailored CV PDFs** (`output/cv-{slug}-...pdf`) — one per shortlisted consultant, ready to send to the client.
- **N tracker rows** (`data/applications.md`) — one per shortlisted consultant, each showing its own Score and Status, all linked to the same report.

Consultants that scored below threshold (and weren't the top-1) produce **no** artifacts — they show up only in the Shortlist table inside the report with verdict `SKIP`.

### 6.4 Apply flow (downstream of evaluation)

**Input:** user picks a shortlisted slug and says "apply".

| Step | Action | Artifact |
|---|---|---|
| 1 | Read the shared report + the chosen consultant's Block E/F | — |
| 2 | If form is live: Playwright fills fields using that consultant's profile.yml + tailored answers | — |
| 3 | User reviews and clicks Submit (system never submits) | — |
| 4 | User confirms; system updates that specific row's Status `Evaluated → Applied` | `data/applications.md` (row with `Candidate=slug` updated) |

Other shortlisted rows for the same JD remain at `Evaluated` until separately applied.

### 6.5 Artifacts summary (where things live)

| Artifact | Path | Written by | Consumed by |
|---|---|---|---|
| Firm identity | `config/firm.yml` | onboarding, migration | every mode |
| Consultant CVs | `consultants/{slug}/cv.md` | onboarding, user edits | oferta, pdf, apply |
| Consultant profile | `consultants/{slug}/profile.yml` | onboarding, user edits | oferta, pdf, contacto |
| Per-consultant overrides | `consultants/{slug}/_profile.md` | user edits | oferta |
| Firm-level profile | `modes/_profile.md` | onboarding, migration | every mode |
| Raw JD snapshot | `jds/{company-slug}-{role-slug}-{date}.md` | oferta fetch step | auditing |
| Evaluation report | `reports/{###}-...md` | oferta | tracker, apply, interview-prep |
| Tailored PDF CV | `output/cv-{slug}-{company}-{date}.pdf` | pdf mode | the client |
| Tracker rows | `data/applications.md` | merge-tracker | dashboard, tracker mode |
| Pending TSVs | `batch/tracker-additions/*.tsv` | oferta / batch | merge-tracker |
| Processed TSVs | `batch/tracker-additions/merged/*.tsv` | merge-tracker | audit trail |
| Story bank | `consultants/{slug}/story-bank.md` | oferta Block F (per-consultant) | interview-prep mode |
| Migration backup | `.migration-backup/{ts}/*` | migrate-to-consultancy | rollback |

---

## 7. Idempotency & re-evaluation

The pipeline must be safe to re-run on the same JD — whether because the scanner re-surfaced it, the user pasted it twice, the firm onboarded a new consultant and wants to re-score, or the JD was updated by the employer.

### 7.1 Canonical dedup key for a JD

Primary key: **normalized URL** (strip tracking params like `utm_*`, `gh_src`, trailing slashes, query fragments). Fallback when URL is missing or degenerate: `(normalizeCompany, roleFuzzyMatch)` — using the **unified** normalization functions introduced in Phase 2 (see §8, Phase 2 notes on `normalizeCompany` and `roleMatch` consolidation).

The report header already carries `**URL:** {url}` (required by `CLAUDE.md` rule 3 under "Pipeline Integrity"). At eval start, scan `reports/` for an existing report whose header URL normalizes to the same key. If found → **re-evaluation**. If not → **new evaluation**.

### 7.2 Per-artifact re-run semantics

| Artifact | Re-run behavior |
|---|---|
| **JD snapshot** (`jds/{company-slug}-{role-slug}-{date}.md`) | Overwrite if same date. If older snapshot exists on a different date, keep both (audit trail of JD text over time — useful if the employer edited the posting). |
| **Report** (`reports/{###}-...md`) | **Update in place**: keep original `###` and original filename. Overwrite body with the latest evaluation. Header gains `**Last re-evaluated:** YYYY-MM-DD` line; the original `**Date:**` stays as the first-eval date. Never issue a new report number for the same JD. |
| **Shortlist changes on re-eval** | New consultants now above threshold → **new tracker rows added** for them, linked to the same report. Consultants that dropped below threshold → their existing row is preserved and gets a note appended (`Re-eval YYYY-MM-DD: now below threshold`), and `Status` is NOT reset (if they were `Applied` or `Interview`, that stands). |
| **PDFs** (`output/cv-{slug}-{company}-{date}.pdf`) | Always regenerate for each shortlisted consultant using today's date. If a prior PDF exists on a different date, keep both — the file is the record of what was actually sent to the client. Same-date re-run overwrites (idempotent within a day). |
| **Tracker rows** | Composite dedup key `(normCompany, roleFuzzy, candidateSlug)`. On match, update in place: `Score` → latest score, `Report` link unchanged (still points to the same report number), `Notes` gets `Re-eval YYYY-MM-DD (oldScore→newScore)` prepended. Notes retains the **5 most recent** `Re-eval` entries; when a 6th is prepended, the oldest collapses to `(+N earlier)`. **Status is preserved** — a re-eval never regresses Applied/Interview/Offer back to Evaluated. |
| **Story bank** (`consultants/{slug}/story-bank.md`) | Append-only per consultant, with a stable story ID (title slug). On re-eval, only append stories whose ID isn't already present in that consultant's file. |
| **Pending TSVs** (`batch/tracker-additions/*.tsv`) | File named `{num}-{slug}.tsv`; collision on re-run resolves by overwrite (the pending row reflects the latest eval until merged). After merge, moves to `merged/` with same name — if a subsequent re-eval produces a new TSV with the same name, it goes through merge again and the old one in `merged/` is either overwritten or timestamped (choose overwrite — the merged row in `applications.md` is the source of truth, `merged/` is an audit trail). |
| **Migration backup** (`.migration-backup/{ts}/`) | Every migration run creates a new timestamped folder. Never overwritten. |

### 7.3 What the user sees on a re-run

Example: user pastes the same JD URL twice on different days.

- **First run** (2026-04-16): report `#047`, three tracker rows (alice=4.6 Evaluated, bob=4.1 Evaluated, carol=3.2 SKIP).
- User applies alice → row becomes `Applied`.
- **Second run** (2026-04-23, after adding a new consultant `dave`): system detects same URL → re-eval flow.
  - Report `#047` overwritten with updated body; header now shows `**Last re-evaluated:** 2026-04-23`.
  - Alice's row: `Score` refreshed (say 4.7), `Status` **stays `Applied`**, notes get `Re-eval 2026-04-23 (4.6→4.7)`.
  - Bob's row: refreshed similarly; status stays `Evaluated`.
  - Carol's row: still below threshold, notes get `Re-eval 2026-04-23: below threshold`.
  - Dave: now scores 4.3 → **new tracker row added** with `Status=Evaluated`, linked to report `#047`.
  - PDFs: alice/bob/dave get new PDFs dated 2026-04-23; the 2026-04-16 PDFs are kept on disk.

**Tracker row count after two runs:** 4 rows for this JD (alice, bob, carol, dave), one report, two sets of PDFs.

### 7.4 Dedup safety net

Even if the oferta mode somehow fails to detect a re-eval (e.g., URL changed but the posting is the same role), the merge step stops row explosion:

- `merge-tracker.mjs` composite key `(normCompany, roleFuzzy, candidate)` rejects duplicate rows for the same candidate pitched to the same role at the same company.
- `dedup-tracker.mjs` (manual cleanup) collapses any stragglers that slipped through, preserving the most advanced `Status` per cluster (the existing `STATUS_RANK` logic in `dedup-tracker.mjs:28-50` is candidate-agnostic — just needs the grouping key to include candidate).
- `verify-pipeline.mjs` post-merge check warns if the same `(company, role, candidate)` key appears in more than one row.

### 7.5 Edge cases called out

- **Employer edits the JD URL** (e.g., Greenhouse `gh_jid` changes) → URL dedup misses → fuzzy company+role fallback catches it. If it still misses, the duplicate surfaces in the `Shortlist` section of the new report; user can manually mark the old report superseded.
- **Consultant is removed from the roster** (`consultants/{slug}/` deleted) → their historical tracker rows remain intact (the slug is a label, not a foreign key). `verify-pipeline.mjs` emits a warning for rows whose slug no longer resolves in `consultants/`, so the user can decide whether to archive or rewrite history.
- **Threshold changed in `firm.yml`** → next re-eval applies the new threshold. Historical reports keep their original shortlist table as a snapshot of what was decided at eval time.

---

## 8. Phased delivery

Each phase is reviewable and mergeable independently. Phases 1–3 produce a working interactive flow. Phase 4 is scoped but deferred.

### Phase 1 — Foundation (no behavior change yet)

**Goal:** Land the new data layout and a migration path.

Files:
- `config/firm.example.yml` — NEW. Schema:
  ```yaml
  firm:
    name: "Acme Consulting"          # firm display name (used in reports, outreach)
    contact_email: "hiring@acme.io"  # optional: firm contact for pitches
    website: "https://acme.io"       # optional: firm website
    language: "en"                    # default output language (en/de/fr/ja)

  shortlist:
    policy: "hybrid"                 # hybrid = top 1 always + others ≥ threshold
    threshold: 4.0                   # minimum score for additional shortlist slots
    min_score: null                  # optional floor: below this, even top-1 is SKIP

  compensation:
    floor: null                      # optional firm-wide walk-away number (e.g., "$80K")
    currency: "USD"                  # default currency for comp comparisons
  ```
- `.gitignore` — UPDATE. Add `.migration-backup/` entry (contains personal CV and profile data; must not be committed to version control).
- `consultants/README.md` — NEW. Explains roster layout + how to add a consultant.
- `migrate-to-consultancy.mjs` — NEW. CLI interface: `node migrate-to-consultancy.mjs [--slug=<name>] [--dry-run]`. If `--slug` is omitted, derives slug from `candidate.full_name` in `config/profile.yml` via kebab-case (e.g., "Jane Smith" → `jane-smith`). No interactive prompts — all existing scripts are non-interactive and this follows the same pattern. If `cv.md` and `config/profile.yml` exist at root:
  0. Run `node doctor.mjs`; abort if unhealthy.
  1. Back up originals to `.migration-backup/{timestamp}/`.
  2. Resolve slug from `--slug` flag or derive from name.
  3. Move `cv.md`, `article-digest.md` → `consultants/{slug}/`.
  4. Split `config/profile.yml`: firm fields (identity, shortlist policy, comp floor) → `config/firm.yml`; personal fields → `consultants/{slug}/profile.yml`.
  5. Copy `modes/_profile.md` → `consultants/{slug}/_profile.md`.
  6. Migrate `interview-prep/story-bank.md` → `consultants/{slug}/story-bank.md` (create empty file if absent).
  7. Write a firm-level boilerplate to `modes/_profile.md`.
  8. Rewrite tracker header to 10-col; add `Candidate=<slug>` to existing rows.
  9. Log rollback hint.
- `docs/migration/rollback.md` — NEW. How to restore from `.migration-backup/`.
- `update-system.mjs` — DELETE. This is a hard fork (Decision 6a); the upstream update mechanism no longer applies. Remove the "Update Check" section from CLAUDE.md as well.
- `DATA_CONTRACT.md` — UPDATE. User layer: add `consultants/*`, `config/firm.yml`. Remove singleton `cv.md`/`article-digest.md` entries. Replace `interview-prep/story-bank.md` with `consultants/{slug}/story-bank.md`. Add a note that the System/User Layer distinction is retained for documentation but no automatic update process enforces it.
- `CLAUDE.md` — UPDATE. Remove the "Update Check" section. Onboarding flow asks "how many consultants?" and collects each one's CV. First-run check looks for `consultants/` + at least one `profile.yml` + `config/firm.yml`.

**Exit criteria:** `node migrate-to-consultancy.mjs` converts an existing setup; a fresh install can onboard multiple consultants.

### Phase 2 — Tracker schema

**Goal:** 10-column tracker with composite dedup key.

Files:
- `lib/normalize.mjs` — NEW. Shared module exporting `normalizeCompany()`, `normalizeRole()`, `roleMatch()`, `ROLE_STOPWORDS`, `LOCATION_STOPWORDS`. Single source of truth for all JS scripts (see prerequisite below).
- `data/applications.md` template (inside `CLAUDE.md` onboarding) — UPDATE to 10-col header.
- `merge-tracker.mjs` — UPDATE. Import from `lib/normalize.mjs`. Extend `parseTsvContent` to 10 cols; add `candidate` to dedup key; preserve the column-swap heuristic for legacy inputs during transition (but reject 9-col TSVs with a clear error pointing to the migration).
- `dedup-tracker.mjs` — UPDATE. Group by `(normCompany, normRole, candidate)`.
- `verify-pipeline.mjs` — UPDATE. Field indices shift by +1 after Role; add check that `Candidate` column is a known slug from `consultants/`.
- `cv-sync-check.mjs` — UPDATE. Iterate `consultants/*/` and verify each has a `cv.md` and `profile.yml` with required fields; warn (not error) if `story-bank.md` is absent — it is created lazily on first Block F evaluation.
- `normalize-statuses.mjs` — UPDATE. Field indices shift by +1 after Role (currently reads `parts[6]` as status; after migration `parts[6]` is Score). Without this fix the script would silently try to normalize score values as statuses.
- `doctor.mjs` — UPDATE. Check `config/firm.yml`, consultant roster integrity (each `consultants/*/` has `cv.md` + `profile.yml` with required fields), matching slugs in tracker vs roster.
- `test-all.mjs` — UPDATE. Existing 63+ checks need updating for: 10-col tracker format, `config/firm.yml` presence, `consultants/` roster structure, new TSV naming convention. Add test cases for the migration script (9-col → 10-col conversion, slug derivation, backup creation).
- `CLAUDE.md` — UPDATE (Phase 2 additions on top of Phase 1 changes). Update the "TSV Format for Tracker Additions" section to 10-col format with `candidate` column. Update the "Pipeline Integrity" dedup key documentation. Update the `applications.md` header template in the onboarding section.
- `dashboard/main.go` — UPDATE. Add a guard that detects the 10-col `Candidate` header in `data/applications.md` and exits with: `"Dashboard not yet updated for 10-column tracker (Phase 5). Use the CLI tracker mode instead."` This prevents silent data corruption between Phase 2 and Phase 5.
- `batch/tracker-additions/` — no code change, but TSV schema is now 10 col. File naming changes from `{num}-{company-slug}.tsv` to `{num}-{candidate-slug}.tsv` (see §4).

**Prerequisite — unify normalization functions:** Before updating dedup keys, consolidate the divergent implementations of `normalizeCompany` and role fuzzy matching into a shared module (`lib/normalize.mjs`) imported by all scripts:

| Current file | `normalizeCompany` behavior | `roleMatch` behavior |
|---|---|---|
| `merge-tracker.mjs:70` | strips all non-`[a-z0-9]` | substring `includes`, words >3 chars, no stopwords, no ratio check |
| `dedup-tracker.mjs:52` | preserves spaces, strips `()` separately | exact equality, words >2 chars, stopword filtering, ratio ≥ 0.6 |
| `verify-pipeline.mjs:114` | inline, strips all non-`[a-z0-9]` | (none — uses exact string key) |
| `career.go:345` | strips common suffixes (Inc, LLC, Ltd) | (N/A — Go dashboard, deferred to Phase 5) |

Adopt `dedup-tracker.mjs`'s version as the canonical implementation (it's the most thorough — stopwords, ratio check, space-aware normalization). All three JS scripts import from `lib/normalize.mjs`. The Go dashboard aligns in Phase 5.

**Exit criteria:** `node verify-pipeline.mjs` passes on a migrated setup; a manually written 10-col TSV merges correctly and produces the new markdown row format; `node normalize-statuses.mjs --dry-run` correctly identifies the status column in the new format; `node test-all.mjs` passes.

### Phase 3 — Evaluation flow

**Goal:** Interactive modes evaluate the roster and produce the new report/PDF/tracker outputs.

Files:
- `modes/_shared.md` — UPDATE. Sources of Truth now describe the roster + firm.yml. Add "Roster Evaluation" section describing the hybrid shortlist rule and where to look up the threshold.
- `modes/_profile.template.md` — UPDATE. Becomes the firm-level template (negotiation scripts, location policy, default archetypes that all consultants share). Per-consultant customization belongs in `consultants/{slug}/_profile.md`.
- `modes/oferta.md` — REWRITE. New flow:
  1. Paso 0: detect archetype (shared).
  2. Block A: role summary (shared).
  3. Roster loop: for each consultant, compute per-consultant score (mini Block B against their CV).
  4. Apply hybrid shortlist rule from `firm.yml`.
  5. For each shortlisted consultant: full Block B, C, E, F against their materials.
  6. Block D: comp (shared).
  7. Block G: legitimacy (shared).
  8. Write single report file with the structure in §5.
- `modes/auto-pipeline.md` — UPDATE. After the new `oferta` flow: iterate shortlisted consultants, call `pdf` for each, write N tracker TSV rows pointing to the same report.
- `modes/pdf.md` — UPDATE. Takes a `consultant_slug` parameter; reads from `consultants/{slug}/cv.md` and `consultants/{slug}/profile.yml`.
- `modes/apply.md` — UPDATE. Prompt "which consultant are we applying with?" if ambiguous; otherwise infer from the active shortlist.
- `modes/tracker.md` — UPDATE. Support filtering by consultant; show per-consultant activity summaries.
- `modes/contacto.md` — UPDATE. Takes a consultant slug for LinkedIn outreach so the message signature matches.
- `modes/interview-prep.md` — UPDATE. Currently hardcodes `cv.md`, `config/profile.yml`, `modes/_profile.md` as inputs (lines 4-5). Update to read from `consultants/{slug}/cv.md`, `consultants/{slug}/profile.yml`, and `consultants/{slug}/_profile.md`. Must prompt "which consultant?" if not clear from context (e.g., user says "prep for interview at Acme" without naming a consultant — check the tracker for which consultant(s) have `Interview` status at that company).
- `modes/ofertas.md` — UPDATE. Comparison mode now has a per-consultant dimension. Two sub-modes: (1) "compare these JDs for consultant X" — rank JDs by that consultant's score; (2) "compare these JDs across the roster" — matrix view showing each consultant's score per JD, highlighting best-fit pairings. Default to mode 2 if no consultant is specified.
- `.claude/skills/career-ops/SKILL.md` — UPDATE. Reference the new modes behavior; no routing change needed.

**Exit criteria:** Pasting a JD URL produces a report with shortlist + per-consultant blocks, one PDF per shortlisted consultant, one tracker row per shortlisted consultant — all manually verifiable on a 2-consultant test roster.

### Phase 4 — Deferred scope (separate approval)

Not in scope for Phases 1–3, documented here so nothing is lost.

- `batch/batch-prompt.md` — REWRITE for roster evaluation. Biggest prompt change: headless worker must iterate the roster, apply the shortlist rule, emit N TSV rows.
- `modes/de/*`, `modes/fr/*`, `modes/ja/*`, `modes/pt/*`, `modes/ru/*` — mirror the Phase 3 changes. Low priority unless the firm pitches into those markets.
- `analyze-patterns.mjs`, `followup-cadence.mjs` — add per-consultant grouping.
- OpenCode commands under `.opencode/commands/` — descriptions may need a line about multi-consultant behavior; no logic change (they all invoke the skill).

Until Phase 4 lands, the batch flow is unavailable. Interactive flow via Phases 1–3 is sufficient for the firm's day-to-day.

### Phase 5 — Dashboard fix

**Goal:** Restore the Go TUI dashboard to parse the 10-column tracker correctly.

**Dependency:** Requires Phase 2 (10-col tracker) to be merged and stable.

**⚠️ WARNING:** Between Phase 2 and Phase 5, the Go dashboard will **silently display corrupted data** — not just "fail to parse." The parser reads `fields[4]` as Score and `fields[5]` as Status (`career.go:80-91`). After the 10-col migration, `fields[4]` contains the Candidate slug and `fields[5]` contains the Score. The dashboard will render consultant names as numeric scores (parsed as 0.0) and scores as status labels. **Do not use the dashboard between Phase 2 and Phase 5.** Add a guard to `dashboard/main.go` in Phase 2 that detects the 10-col header and exits with a clear error message pointing to Phase 5.

Files:
- `dashboard/internal/model/career.go` — ADD `Candidate string` field to `CareerApplication` struct.
- `dashboard/internal/data/career.go` — Bump all hardcoded `fields[i]` indices after `Role` by +1; parse the new `Candidate` column. Align `normalizeCompany` (currently strips common suffixes like Inc/LLC/Ltd) to match the canonical JS implementation in `lib/normalize.mjs`. Remove the Phase 2 guard from `dashboard/main.go`.
- `dashboard/internal/ui/screens/*` — UPDATE any screen that renders application rows to display the `Candidate` column; add filtering by consultant slug.
- `dashboard/internal/model/career.go` — UPDATE metrics functions to optionally group by consultant (add `GroupByConsultant bool` option).

**Exit criteria:** `go build ./...` passes; dashboard renders the migrated `data/applications.md` without errors; per-consultant pipeline activity is filterable from the TUI.

## 9. Verification

After each phase, run end-to-end on a test roster:

1. **Fresh install**: new checkout → onboarding creates `config/firm.yml` + `consultants/alice/` + `consultants/bob/`. `node cv-sync-check.mjs` passes.
2. **Migration**: a pre-existing single-candidate setup → `node migrate-to-consultancy.mjs` → roster contains one consultant, firm.yml has identity, `.migration-backup/` contains originals. `node verify-pipeline.mjs` passes.
3. **Evaluation**: paste a known JD URL → one report file with shortlist block + per-consultant blocks → one PDF per shortlisted consultant in `output/` → N rows in `data/applications.md` with correct `Candidate` values.
4. **Pipeline health**: `node verify-pipeline.mjs` → `node merge-tracker.mjs --dry-run` → `node dedup-tracker.mjs --dry-run` — all clean.
5. **Dashboard** (Phase 5): `go build ./...` passes; `./career-dashboard` renders the 10-col tracker without errors; `Candidate` column is visible and filterable.
6. **Rollback rehearsal**: copy `.migration-backup/*` back → original single-candidate setup works.

## 10. Rollback

`docs/migration/rollback.md` documents:
- Restoring from `.migration-backup/{timestamp}/`.
- Reverting the tracker schema (paste old header, remove Candidate column, re-run legacy `merge-tracker.mjs` from git history).
- Uninstalling `consultants/` and `config/firm.yml`.

Full rollback is only possible if the user has not created consultant-specific data post-migration; otherwise partial rollback is all that's supported.

## 11. Out of scope

- Billing/attribution (who gets credit for a placement) — not a system feature.
- Utilization dashboards beyond what the Go TUI already exposes — Phase 5 adds a grouping lens, not new views.
- Automated "pitch" document generation for the client — the report itself is the artifact; a dedicated pitch format can be a later enhancement.
- Multi-firm support (one installation serving multiple consultancies) — the firm is singleton by design.
