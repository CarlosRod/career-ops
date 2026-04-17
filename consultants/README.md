# Consultant Roster

This directory contains one subdirectory per consultant. The system discovers the roster at runtime by scanning `consultants/*/profile.yml` — no index file needed.

## Directory structure per consultant

```
consultants/
  alice/
    cv.md               # required: markdown CV
    profile.yml          # required: name, email, archetypes, comp targets
    _profile.md          # optional: per-consultant overrides (negotiation, framing)
    article-digest.md    # optional: proof points from portfolio
    story-bank.md        # auto-created: accumulated STAR+R stories from evaluations
```

## Adding a new consultant

1. Create a directory with a kebab-case slug: `consultants/jane-doe/`
2. Add `cv.md` — clean markdown with sections: Summary, Experience, Projects, Education, Skills.
3. Add `profile.yml` — copy from `config/profile.example.yml` and fill in personal fields:
   - `candidate.full_name`, `candidate.email`, `candidate.location`
   - `target_roles.primary` and `target_roles.archetypes`
   - `compensation.target_range` and `compensation.minimum`
   - `narrative.headline`, `narrative.exit_story`, `narrative.superpowers`
4. Optionally add `_profile.md` for overrides that differ from the firm-level `modes/_profile.md`.
5. Optionally add `article-digest.md` with proof points.
6. Run `node cv-sync-check.mjs` to verify the roster is valid.

## Removing a consultant

Delete their directory. Historical tracker rows referencing their slug are preserved — `verify-pipeline.mjs` will warn about orphaned slugs so you can decide whether to archive those rows.

## Required fields in profile.yml

- `candidate.full_name` — used for slug derivation and PDF generation
- `candidate.email` — used in applications
- `target_roles.archetypes` — at least one, used for scoring
- `compensation.target_range` — used in comp analysis
