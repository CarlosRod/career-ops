# Mode: batch — Bulk Offer Processing (Consultancy)

Two usage modes: **conductor --chrome** (navigates portals live) or **standalone** (script for pre-collected URLs).

Each JD goes through the full roster evaluation — one report with shortlist, one PDF per shortlisted consultant, one tracker row per shortlisted consultant.

## Architecture

```
Claude Conductor (claude --chrome --dangerously-skip-permissions)
  │
  │  Chrome: navigates portals (logged-in sessions)
  │  Reads DOM directly — user sees everything in real time
  │
  ├─ Offer 1: reads JD + URL from DOM
  │    └─► claude -p worker → 1 report .md + N PDFs + N tracker TSVs
  │        (N = shortlisted consultants for this JD)
  │
  ├─ Offer 2: clicks next, reads JD + URL
  │    └─► claude -p worker → 1 report .md + N PDFs + N tracker TSVs
  │
  └─ End: merge tracker-additions → applications.md + summary
```

Each worker is a `claude -p` child with a clean 200K token context. The conductor only orchestrates.

## Files

```
batch/
  batch-input.tsv               # URLs (from conductor or manual)
  batch-state.tsv               # Progress (auto-generated, gitignored)
  batch-runner.sh               # Standalone orchestrator script
  batch-prompt.md               # Worker prompt template (consultancy mode)
  logs/                         # One log per offer (gitignored)
  tracker-additions/            # Tracker lines for merge (gitignored)
                                # Filename: {num}-{candidate-slug}.tsv
                                # N files per JD (one per shortlisted consultant)
```

## Mode A: Conductor --chrome

1. **Read state:** `batch/batch-state.tsv` → skip already-processed
2. **Navigate portal:** Chrome → search URL
3. **Extract URLs:** Read result DOM → append to `batch-input.tsv`
4. **For each pending URL:**
   a. Chrome: click offer → read JD text from DOM
   b. Save JD to `/tmp/batch-jd-{id}.txt`
   c. Compute next REPORT_NUM (one per JD, not per consultant)
   d. Execute via Bash:
      ```bash
      claude -p --dangerously-skip-permissions \
        --append-system-prompt-file batch/batch-prompt.md \
        "Process this offer. URL: {url}. JD: /tmp/batch-jd-{id}.txt. Report: {num}. ID: {id}"
      ```
   e. Update `batch-state.tsv` (completed/failed + shortlist info + report_num)
   f. Log to `logs/{report_num}-{id}.log`
   g. Chrome: back → next offer
5. **Pagination:** If no more offers → click "Next" → repeat
6. **End:** Run `node merge-tracker.mjs` → merge `tracker-additions/` into `applications.md` + summary

## Mode B: Standalone script

```bash
batch/batch-runner.sh [OPTIONS]
```

Options:
- `--dry-run` — list pending, don't execute
- `--retry-failed` — only retry failed offers
- `--start-from N` — start from ID N
- `--parallel N` — N parallel workers
- `--max-retries N` — attempts per offer (default: 2)
- `--min-score N` — skip PDF/tracker for offers where top consultant scores below N (default: 0)

## batch-state.tsv format

```
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-...	2026-...	002	4.6	-	0
2	https://...	failed	2026-...	2026-...	-	-	Error msg	1
3	https://...	pending	-	-	-	-	-	0
```

The `score` column holds the **top consultant's** score (used by `--min-score` gate). Shortlist details live in the worker's JSON output and in the generated report file.

## Resumability

- If killed → re-run → reads `batch-state.tsv` → skips completed
- Lock file (`batch-runner.pid`) prevents double execution
- Each worker is independent: failure on offer #47 doesn't affect the rest

## Workers (claude -p)

Each worker receives `batch-prompt.md` as system prompt. Self-contained. See `batch/batch-prompt.md` for the full worker contract.

Worker outputs per JD:
1. **1 report** `.md` in `reports/`
2. **N PDFs** in `output/` (one per shortlisted consultant)
3. **N tracker TSV lines** in `batch/tracker-additions/` (one per shortlisted consultant, filename `{num}-{slug}.tsv`)
4. **1 JSON summary** to stdout (includes shortlist array)

## Error handling

| Error | Recovery |
|-------|----------|
| URL unreachable | Worker fails → conductor marks `failed`, next |
| JD behind login | Conductor tries DOM read. If fails → `failed` |
| Portal layout change | Conductor reasons over HTML, adapts |
| Worker crashes | Conductor marks `failed`, next. Retry with `--retry-failed` |
| Conductor dies | Re-run → reads state → skips completed |
| PDF fails for one consultant | Report .md saved. That consultant's PDF is `❌`. Other consultants' PDFs still generate. |
| No shortlisted consultants | Report saved with empty shortlist note. No PDFs. No tracker rows. Worker exits with `completed` status. |

## Consultancy-specific notes

- **Multiple rows per JD:** If 3 consultants are shortlisted for one JD, `applications.md` gains 3 rows (one per consultant) all linking to the same report.
- **PDF filenames:** `output/cv-{candidate-slug}-{company-slug}-{date}.pdf` — consultant slug, not a generic "candidate".
- **Tracker dedup:** Uses composite key `(normCompany, roleMatch, candidate)`. Same role at same company for different consultants is NOT a duplicate.
- **Playwright unavailable:** Batch mode uses WebFetch only. Block G marks posting freshness as "unverified (batch mode)". Users can re-verify manually via interactive `/career-ops oferta`.
