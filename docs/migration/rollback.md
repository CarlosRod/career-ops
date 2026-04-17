# Rollback — Consultancy Migration

If you need to revert the migration, follow these steps. Full rollback is only possible if you have **not** created additional consultant-specific data post-migration (e.g., new consultants, new evaluations with the 10-col tracker). If you have, only partial rollback is supported.

## Prerequisites

- A `.migration-backup/{timestamp}/` directory exists (created by `migrate-to-consultancy.mjs`)
- Identify the correct timestamp: `ls .migration-backup/`

## Full rollback

```bash
# 1. Set your backup timestamp
BACKUP=".migration-backup/2026-04-16-1430"

# 2. Restore originals
cp "$BACKUP/cv.md" ./cv.md
cp "$BACKUP/config/profile.yml" ./config/profile.yml

# 3. Restore _profile.md (if backed up)
[ -f "$BACKUP/modes/_profile.md" ] && cp "$BACKUP/modes/_profile.md" ./modes/_profile.md

# 4. Restore article-digest.md (if backed up)
[ -f "$BACKUP/article-digest.md" ] && cp "$BACKUP/article-digest.md" ./article-digest.md

# 5. Restore story bank (if backed up)
[ -f "$BACKUP/interview-prep/story-bank.md" ] && cp "$BACKUP/interview-prep/story-bank.md" ./interview-prep/story-bank.md

# 6. Restore tracker (if backed up — reverts to 9-col format)
[ -f "$BACKUP/data/applications.md" ] && cp "$BACKUP/data/applications.md" ./data/applications.md

# 7. Remove consultancy artifacts
rm -rf consultants/
rm -f config/firm.yml

# 8. Verify
node doctor.mjs
node verify-pipeline.mjs
```

## Partial rollback (post-migration data exists)

If you've run evaluations after migration, the tracker has 10-column rows with Candidate data. You can't fully revert without losing that data.

**Option A — Keep the data, revert the layout:**
1. Restore `cv.md`, `config/profile.yml`, `modes/_profile.md` from backup
2. Manually remove the `Candidate` column from `data/applications.md`
3. Remove `config/firm.yml` and `consultants/`
4. Run `node verify-pipeline.mjs` to check health

**Option B — Archive and start fresh:**
1. Copy `data/applications.md` somewhere safe
2. Do a full rollback (above)
3. Manually port any new entries from the archived tracker (strip the Candidate column)

## What the backup contains

| File | Location in backup |
|------|--------------------|
| `cv.md` | `{backup}/cv.md` |
| `config/profile.yml` | `{backup}/config/profile.yml` |
| `modes/_profile.md` | `{backup}/modes/_profile.md` |
| `article-digest.md` | `{backup}/article-digest.md` |
| `interview-prep/story-bank.md` | `{backup}/interview-prep/story-bank.md` |
| `data/applications.md` | `{backup}/data/applications.md` |

Files that did not exist at migration time are not in the backup.
