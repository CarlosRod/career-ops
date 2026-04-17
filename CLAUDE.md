# Career-Ops -- AI Job Search Pipeline

## Origin

This system was built and used by [santifer](https://santifer.io) to evaluate 740+ job offers, generate 100+ tailored CVs, and land a Head of Applied AI role. The archetypes, scoring logic, negotiation scripts, and proof point structure all reflect his specific career search in AI/automation roles.

The portfolio that goes with this system is also open source: [cv-santiago](https://github.com/santifer/cv-santiago).

**It will work out of the box, but it's designed to be made yours.** If the archetypes don't match your career, the modes are in the wrong language, or the scoring doesn't fit your priorities -- just ask. You (AI Agent) can edit the user's files. The user says "change the archetypes to data engineering roles" and you do it. That's the whole point.

## Data Contract (CRITICAL)

There are two layers. Read `DATA_CONTRACT.md` for the full list.

**User Layer (firm and consultant data, personalization goes HERE):**
- `config/firm.yml`, `consultants/*/`, `modes/_profile.md`, `portals.yml`
- `data/*`, `reports/*`, `output/*`

**System Layer (shared logic):**
- `modes/_shared.md`, `modes/oferta.md`, all other modes
- `CLAUDE.md`, `*.mjs` scripts, `dashboard/*`, `templates/*`, `batch/*`

**THE RULE: When the user asks to customize anything per-consultant (archetypes, narrative, proof points, comp targets), ALWAYS write to `consultants/{slug}/_profile.md` or `consultants/{slug}/profile.yml`. For firm-level customizations (negotiation scripts, location policy, shortlist policy), write to `modes/_profile.md` or `config/firm.yml`. NEVER edit `modes/_shared.md` for user-specific content.**

## What is career-ops

AI-powered job search automation built on Claude Code: pipeline tracking, offer evaluation, CV generation, portal scanning, batch processing.

### Main Files

| File | Function |
|------|----------|
| `data/applications.md` | Application tracker |
| `data/pipeline.md` | Inbox of pending URLs |
| `data/scan-history.tsv` | Scanner dedup history |
| `portals.yml` | Query and company config |
| `templates/cv-template.html` | HTML template for CVs |
| `generate-pdf.mjs` | Playwright: HTML to PDF |
| `config/firm.yml` | Firm identity, shortlist policy, comp floor |
| `consultants/{slug}/cv.md` | Per-consultant CV |
| `consultants/{slug}/profile.yml` | Per-consultant identity, targets, comp |
| `consultants/{slug}/article-digest.md` | Per-consultant proof points (optional) |
| `consultants/{slug}/story-bank.md` | Per-consultant STAR+R stories |
| `interview-prep/{company}-{role}.md` | Company-specific interview intel reports |
| `analyze-patterns.mjs` | Pattern analysis script (JSON output) |
| `followup-cadence.mjs` | Follow-up cadence calculator (JSON output) |
| `data/follow-ups.md` | Follow-up history tracker |
| `scan.mjs` | Zero-token portal scanner — hits Greenhouse/Ashby/Lever APIs directly, zero LLM cost |
| `check-liveness.mjs` | Job posting liveness checker |
| `liveness-core.mjs` | Shared liveness logic (expired signals win over generic Apply text) |
| `reports/` | Evaluation reports (format: `{###}-{company-slug}-{YYYY-MM-DD}.md`). Shortlist table + shared blocks (A/D/G) + per-consultant blocks (B/C/E/F). Header includes `**Legitimacy:** {tier}` and `**Shortlist:** {slug1}, {slug2}`. |

### OpenCode Commands

When using [OpenCode](https://opencode.ai), the following slash commands are available (defined in `.opencode/commands/`):

| Command | Claude Code Equivalent | Description |
|---------|------------------------|-------------|
| `/career-ops` | `/career-ops` | Show menu or evaluate JD with args |
| `/career-ops-pipeline` | `/career-ops pipeline` | Process pending URLs from inbox |
| `/career-ops-evaluate` | `/career-ops oferta` | Evaluate job offer (A-F scoring) |
| `/career-ops-compare` | `/career-ops ofertas` | Compare and rank multiple offers |
| `/career-ops-contact` | `/career-ops contacto` | LinkedIn outreach (find contacts + draft) |
| `/career-ops-deep` | `/career-ops deep` | Deep company research |
| `/career-ops-pdf` | `/career-ops pdf` | Generate ATS-optimized CV |
| `/career-ops-training` | `/career-ops training` | Evaluate course/cert against goals |
| `/career-ops-project` | `/career-ops project` | Evaluate portfolio project idea |
| `/career-ops-tracker` | `/career-ops tracker` | Application status overview |
| `/career-ops-apply` | `/career-ops apply` | Live application assistant |
| `/career-ops-scan` | `/career-ops scan` | Scan portals for new offers |
| `/career-ops-batch` | `/career-ops batch` | Batch processing with parallel workers |
| `/career-ops-patterns` | `/career-ops patterns` | Analyze rejection patterns and improve targeting |
| `/career-ops-followup` | `/career-ops followup` | Follow-up cadence tracker |

**Note:** OpenCode commands invoke the same `.claude/skills/career-ops/SKILL.md` skill used by Claude Code. The `modes/*` files are shared between both platforms.

### First Run — Onboarding (IMPORTANT)

**Before doing ANYTHING else, check if the system is set up.** Run these checks silently every time a session starts:

1. Does `config/firm.yml` exist (not just firm.example.yml)?
2. Does `consultants/` exist with at least one `*/profile.yml`?
3. Does each consultant in `consultants/*/` have a `cv.md`?
4. Does `modes/_profile.md` exist (not just _profile.template.md)?
5. Does `portals.yml` exist (not just templates/portals.example.yml)?

If `modes/_profile.md` is missing, copy from `modes/_profile.template.md` silently.

**If ANY of 1-3 is missing, enter onboarding mode.** Do NOT proceed with evaluations, scans, or any other mode until the basics are in place. Guide the user step by step:

#### Step 0: Migration check
If `cv.md` exists at project root AND `config/profile.yml` exists (old single-candidate layout):
> "I see you have an existing single-candidate setup. Want me to migrate it to consultancy mode? This will:
> - Move your CV and profile into a consultant directory
> - Create a firm config with shortlist settings
> - Preserve all your existing data
>
> Run: `node migrate-to-consultancy.mjs --dry-run` to preview, or `node migrate-to-consultancy.mjs` to migrate."

If they accept, run the migration script. After it completes, continue with Step 5 (get to know consultants).

#### Step 1: Firm identity (required)
If `config/firm.yml` is missing, copy from `config/firm.example.yml` and then ask:
> "Let's set up your consultancy. I need:
> - Your firm name
> - Contact email
> - Website (optional)
> - Default language for reports (en/de/fr/ja)
>
> I'll also set up the shortlist policy (default: recommend top scorer + anyone above 4.0/5)."

Fill in `config/firm.yml` with their answers.

#### Step 2: Consultants (required)
Ask:
> "How many consultants do you want to set up? For each one I'll need:
> 1. Their name (used to create a directory, e.g., 'alice' or 'jane-doe')
> 2. Their CV (paste it, share a LinkedIn URL, or describe their experience)
> 3. Target roles and archetypes
> 4. Salary range and location"

For each consultant:
- Create `consultants/{slug}/cv.md` from whatever they provide. Clean markdown with standard sections.
- Create `consultants/{slug}/profile.yml` by copying from `config/profile.example.yml` and filling in personal fields.
- Create `consultants/{slug}/story-bank.md` (empty, with header).
- Optionally create `consultants/{slug}/_profile.md` if they share specific framing/overrides.

#### Step 3: Portals (recommended)
If `portals.yml` is missing:
> "I'll set up the job scanner with 45+ pre-configured companies. Want me to customize the search keywords for your consultants' target roles?"

Copy `templates/portals.example.yml` → `portals.yml`. If they gave target roles in Step 2, update `title_filter.positive` to match.

#### Step 4: Tracker
If `data/applications.md` doesn't exist, create it:
```markdown
# Applications Tracker

| # | Date | Company | Role | Candidate | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-----------|-------|--------|-----|--------|-------|
```

#### Step 5: Get to know the consultants (important for quality)

After the basics are set up, proactively ask for more context about each consultant:

> "The basics are ready. But the system works much better when it knows your consultants well. For each person, can you tell me:
> - What makes them unique? What's their 'superpower'?
> - What kind of work excites them? What should we avoid?
> - Any deal-breakers? (e.g., no on-site, no startups under 20 people)
> - Their best professional achievement
> - Any projects, articles, or case studies they've published?
>
> The more context you give me per consultant, the better I match them to roles."

Store insights in the relevant consultant's `profile.yml` (under narrative), `consultants/{slug}/_profile.md`, or `consultants/{slug}/article-digest.md`.

**After every evaluation, learn.** If the user says "this score is too high for alice" or "you missed that bob has experience in X", update the relevant consultant's files. The system should get smarter with every interaction.

#### Step 6: Ready
Once all files exist, confirm:
> "You're all set! You can now:
> - Paste a job URL to evaluate it against your roster
> - Run `/career-ops scan` (or `/career-ops-scan` if using OpenCode) to search portals
> - Run `/career-ops` to see all commands
>
> Everything is customizable — just ask me to change anything."

Then suggest automation:
> "Want me to scan for new offers automatically? I can set up a recurring scan every few days so you don't miss anything. Just say 'scan every 3 days' and I'll configure it."

If the user accepts, use the `/loop` or `/schedule` skill (if available) to set up a recurring `/career-ops scan` (or `/career-ops-scan` if using OpenCode). If those aren't available, suggest adding a cron job or remind them to run `/career-ops scan` (or `/career-ops-scan` if using OpenCode) periodically.

### Personalization

This system is designed to be customized by YOU (AI Agent). When the user asks you to change archetypes, translate modes, adjust scoring, add companies, or modify negotiation scripts -- do it directly. You read the same files you use, so you know exactly what to edit.

**Common customization requests:**
- "Change the archetypes for [consultant]" → edit `consultants/{slug}/_profile.md` or `consultants/{slug}/profile.yml`
- "Translate the modes to English" → edit all files in `modes/`
- "Add these companies to my portals" → edit `portals.yml`
- "Update [consultant]'s profile" → edit `consultants/{slug}/profile.yml`
- "Update firm settings" → edit `config/firm.yml`
- "Change the CV template design" → edit `templates/cv-template.html`
- "Adjust the scoring weights" → edit `modes/_profile.md` for firm-level, or `modes/_shared.md` for system defaults
- "Change the shortlist threshold" → edit `config/firm.yml` (`shortlist.threshold`)

### Language Modes

Default modes are in `modes/` (English). Additional language-specific modes are available:

- **German (DACH market):** `modes/de/` — native German translations with DACH-specific vocabulary (13. Monatsgehalt, Probezeit, Kündigungsfrist, AGG, Tarifvertrag, etc.). Includes `_shared.md`, `angebot.md` (evaluation), `bewerben.md` (apply), `pipeline.md`.
- **French (Francophone market):** `modes/fr/` — native French translations with France/Belgium/Switzerland/Luxembourg-specific vocabulary (CDI/CDD, convention collective SYNTEC, RTT, mutuelle, prévoyance, 13e mois, intéressement/participation, titres-restaurant, CSE, portage salarial, etc.). Includes `_shared.md`, `offre.md` (evaluation), `postuler.md` (apply), `pipeline.md`.
- **Japanese (Japan market):** `modes/ja/` — native Japanese translations with Japan-specific vocabulary (正社員, 業務委託, 賞与, 退職金, みなし残業, 年俸制, 36協定, 通勤手当, 住宅手当, etc.). Includes `_shared.md`, `kyujin.md` (evaluation), `oubo.md` (apply), `pipeline.md`.

**When to use German modes:** If the user is targeting German-language job postings, lives in DACH, or asks for German output. Either:
1. User says "use German modes" → read from `modes/de/` instead of `modes/`
2. User sets `language.modes_dir: modes/de` in `config/firm.yml` → always use German modes
3. You detect a German JD → suggest switching to German modes

**When to use French modes:** If the user is targeting French-language job postings, lives in France/Belgium/Switzerland/Luxembourg/Quebec, or asks for French output. Either:
1. User says "use French modes" → read from `modes/fr/` instead of `modes/`
2. User sets `language.modes_dir: modes/fr` in `config/firm.yml` → always use French modes
3. You detect a French JD → suggest switching to French modes

**When to use Japanese modes:** If the user is targeting Japanese-language job postings, lives in Japan, or asks for Japanese output. Either:
1. User says "use Japanese modes" → read from `modes/ja/` instead of `modes/`
2. User sets `language.modes_dir: modes/ja` in `config/firm.yml` → always use Japanese modes
3. You detect a Japanese JD → suggest switching to Japanese modes

**When NOT to:** If the user applies to English-language roles, even at French, German, or Japanese companies, use the default English modes.

### Skill Modes

| If the user... | Mode |
|----------------|------|
| Pastes JD or URL | auto-pipeline (evaluate + report + PDF + tracker) |
| Asks to evaluate offer | `oferta` |
| Asks to compare offers | `ofertas` |
| Wants LinkedIn outreach | `contacto` |
| Asks for company research | `deep` |
| Preps for interview at specific company | `interview-prep` |
| Wants to generate CV/PDF | `pdf` |
| Evaluates a course/cert | `training` |
| Evaluates portfolio project | `project` |
| Asks about application status | `tracker` |
| Fills out application form | `apply` |
| Searches for new offers | `scan` |
| Processes pending URLs | `pipeline` |
| Batch processes offers | `batch` |
| Asks about rejection patterns or wants to improve targeting | `patterns` |
| Asks about follow-ups or application cadence | `followup` |

### CV Source of Truth

- `consultants/{slug}/cv.md` is each consultant's canonical CV
- `consultants/{slug}/article-digest.md` has detailed proof points (optional)
- `consultants/{slug}/story-bank.md` has accumulated STAR+R stories
- **NEVER hardcode metrics** -- read them from these files at evaluation time

---

## Ethical Use -- CRITICAL

**This system is designed for quality, not quantity.** The goal is to help the user find and apply to roles where there is a genuine match -- not to spam companies with mass applications.

- **NEVER submit an application without the user reviewing it first.** Fill forms, draft answers, generate PDFs -- but always STOP before clicking Submit/Send/Apply. The user makes the final call.
- **Strongly discourage low-fit applications.** If a score is below 4.0/5, explicitly recommend against applying. The user's time and the recruiter's time are both valuable. Only proceed if the user has a specific reason to override the score.
- **Quality over speed.** A well-targeted application to 5 companies beats a generic blast to 50. Guide the user toward fewer, better applications.
- **Respect recruiters' time.** Every application a human reads costs someone's attention. Only send what's worth reading.

---

## Offer Verification -- MANDATORY

**NEVER trust WebSearch/WebFetch to verify if an offer is still active.** ALWAYS use Playwright:
1. `browser_navigate` to the URL
2. `browser_snapshot` to read content
3. Only footer/navbar without JD = closed. Title + description + Apply = active.

**Exception for batch workers (`claude -p`):** Playwright is not available in headless pipe mode. Use WebFetch as fallback and mark the report header with `**Verification:** unconfirmed (batch mode)`. The user can verify manually later.

---

## CI/CD and Quality

- **GitHub Actions** run on every PR: `test-all.mjs` (63+ checks), auto-labeler (risk-based: 🔴 core-architecture, ⚠️ agent-behavior, 📄 docs), welcome bot for first-time contributors
- **Branch protection** on `main`: status checks must pass before merge. No direct pushes to main (except admin bypass).
- **Dependabot** monitors npm, Go modules, and GitHub Actions for security updates
- **Contributing process**: issue first → discussion → PR with linked issue → CI passes → maintainer review → merge

## Community and Governance

- **Code of Conduct**: Contributor Covenant 2.1 with enforcement actions (see `CODE_OF_CONDUCT.md`)
- **Governance**: BDFL model with contributor ladder — Participant → Contributor → Triager → Reviewer → Maintainer (see `GOVERNANCE.md`)
- **Security**: private vulnerability reporting via email (see `SECURITY.md`)
- **Support**: help questions go to Discord/Discussions, not issues (see `SUPPORT.md`)
- **Discord**: https://discord.gg/8pRpHETxa4

## Stack and Conventions

- Node.js (mjs modules), Playwright (PDF + scraping), YAML (config), HTML/CSS (template), Markdown (data), Canva MCP (optional visual CV)
- Scripts in `.mjs`, configuration in YAML
- Output in `output/` (gitignored), Reports in `reports/`
- JDs in `jds/` (referenced as `local:jds/{file}` in pipeline.md)
- Batch in `batch/` (gitignored except scripts and prompt)
- Report numbering: sequential 3-digit zero-padded, max existing + 1
- **RULE: After each batch of evaluations, run `node merge-tracker.mjs`** to merge tracker additions and avoid duplications.
- **RULE: NEVER create new entries in applications.md if company+role already exists.** Update the existing entry.

### TSV Format for Tracker Additions

Write one TSV file per shortlisted consultant to `batch/tracker-additions/{num}-{candidate-slug}.tsv`. Single line, 10 tab-separated columns:

```
{num}\t{date}\t{company}\t{role}\t{candidate}\t{status}\t{score}/5\t{pdf_emoji}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
```

**Column order (IMPORTANT -- status BEFORE score):**
1. `num` -- report number (integer, same ### as report filename)
2. `date` -- YYYY-MM-DD
3. `company` -- short company name
4. `role` -- job title
5. `candidate` -- consultant slug (e.g., `alice`)
6. `status` -- canonical status (e.g., `Evaluated`)
7. `score` -- format `X.X/5` (e.g., `4.2/5`)
8. `pdf` -- `✅` or `❌`
9. `report` -- markdown link `[num](reports/...)`
10. `notes` -- one-line summary

**Note:** In applications.md, score comes BEFORE status. The merge script handles this column swap automatically.
**File naming:** `{num}-{candidate-slug}.tsv` — e.g., report #047 with alice and bob shortlisted produces `047-alice.tsv` and `047-bob.tsv`.

### Pipeline Integrity

1. **NEVER edit applications.md to ADD new entries** -- Write TSV in `batch/tracker-additions/` and `merge-tracker.mjs` handles the merge.
2. **YES you can edit applications.md to UPDATE status/notes of existing entries.**
3. **NEVER create new entries in applications.md if company+role+candidate already exists.** Update the existing entry.
4. All reports MUST include `**URL:**` in the header. Include `**Legitimacy:** {tier}` and `**Shortlist:** {slug1}, {slug2}` (see Block G in `modes/oferta.md`).
5. All statuses MUST be canonical (see `templates/states.yml`).
6. **Dedup key:** `(normalizeCompany, roleMatch, candidateSlug)` — same role at same company can have multiple rows if for different consultants.
7. Health check: `node verify-pipeline.mjs`
8. Normalize statuses: `node normalize-statuses.mjs`
9. Dedup: `node dedup-tracker.mjs`

### Canonical States (applications.md)

**Source of truth:** `templates/states.yml`

| State | When to use |
|-------|-------------|
| `Evaluated` | Report completed, pending decision |
| `Applied` | Application sent |
| `Responded` | Company responded |
| `Interview` | In interview process |
| `Offer` | Offer received |
| `Rejected` | Rejected by company |
| `Discarded` | Discarded by candidate or offer closed |
| `SKIP` | Doesn't fit, don't apply |

**RULES:**
- No markdown bold (`**`) in status field
- No dates in status field (use the date column)
- No extra text (use the notes column)
