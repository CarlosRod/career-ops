# Mode: tracker — Application Tracker (Consultancy)

Read and display `data/applications.md`.

**10-column format:**
```markdown
| # | Date | Company | Role | Candidate | Score | Status | PDF | Report | Notes |
```

Canonical states (from `templates/states.yml`): `Evaluated` → `Applied` → `Responded` → `Interview` → `Offer` / `Rejected` / `Discarded` / `SKIP`

If the user asks to update a status, edit the corresponding row.

## Filtering

Support filtering by consultant:
- "show tracker for alice" → only rows where Candidate = alice
- "show tracker" (no filter) → all rows, grouped by consultant

## Statistics

Show per-consultant and aggregate stats:

### Per-consultant
- Total evaluations
- By status breakdown
- Average score
- % with PDF generated

### Aggregate (firm-wide)
- Total evaluations across all consultants
- Active pipeline (not SKIP/Rejected/Discarded)
- Top-scoring consultant per active role
- Consultants with most activity this week
