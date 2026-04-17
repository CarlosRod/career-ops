# Mode: auto-pipeline — Full Automatic Pipeline (Consultancy)

When the user pastes a JD (text or URL) without an explicit sub-command, execute the FULL pipeline in sequence:

## Step 0 — Fetch JD

If the input is a **URL** (not pasted JD text), follow this strategy to extract content:

**Priority order:**

1. **Playwright (preferred):** Most job portals (Lever, Ashby, Greenhouse, Workday) are SPAs. Use `browser_navigate` + `browser_snapshot` to render and read the JD.
2. **WebFetch (fallback):** For static pages (ZipRecruiter, WeLoveProduct, company career pages).
3. **WebSearch (last resort):** Search role title + company on secondary portals that index the JD in static HTML.

**If no method works:** Ask the user to paste the JD manually or share a screenshot.

**If the input is JD text** (not URL): use directly, no fetch needed.

## Step 1 — Evaluation A-G (Roster)

Execute the full roster evaluation flow from `modes/oferta.md`:
1. Archetype detection (shared)
2. Block A — Role summary (shared)
3. Roster scoring loop — Mini Block B for each consultant
4. Apply hybrid shortlist rule from `config/firm.yml`
5. For each shortlisted consultant: full Block B, C, E, F
6. Block D — Comp (shared)
7. Block G — Legitimacy (shared)

## Step 2 — Save Report .md

Save the evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md` (see format in `modes/oferta.md`).
Include shortlist table, shared blocks, and per-consultant sections.
Add `**Legitimacy:** {tier}` and `**Shortlist:** {slug1}, {slug2}` to the report header.

## Step 3 — Generate PDFs (one per shortlisted consultant)

For **each** shortlisted consultant (verdict = PITCH):
1. Run the PDF pipeline from `modes/pdf.md` with `consultant_slug={slug}`
2. Output: `output/cv-{slug}-{company-slug}-{date}.pdf`

Consultants with verdict SKIP get no PDF.

## Step 4 — Draft Application Answers (only if top consultant score >= 4.5)

If the top-scoring consultant has score >= 4.5, generate draft answers **for that consultant**:

1. **Extract form questions**: Use Playwright to navigate to the form and snapshot. If not extractable, use generic questions.
2. **Generate answers** using that consultant's CV, profile, and proof points.
3. **Save in the report** as section `## H) Draft Application Answers ({slug})`.

### Generic questions (if not extractable from form)

- Why are you interested in this role?
- Why do you want to work at [Company]?
- Tell us about a relevant project or achievement
- What makes you a good fit for this position?
- How did you hear about this role?

### Tone for Form Answers

**Position: "We're choosing you."** The firm has options and is choosing this company for concrete reasons.

**Tone rules:**
- **Confident without arrogance**: "Our consultant has spent the past year building production AI agent systems — your role is where that experience applies next"
- **Specific and concrete**: Always reference something REAL from the JD or the company, and something REAL from the consultant's experience
- **Direct, no fluff**: 2-4 sentences per answer. No "passionate about..." or "would love the opportunity to..."
- **The hook is the proof, not the claim**: Instead of "great at X", say "built X that does Y"

**Language**: Always in the language of the JD (EN default).

## Step 5 — Update Tracker

For **each** shortlisted consultant, write a TSV to `batch/tracker-additions/{num}-{slug}.tsv` with PDF = ✅.
Then run `node merge-tracker.mjs` to incorporate into `data/applications.md`.

**If any step fails**, continue with remaining steps and mark the failed step as pending in the tracker notes.
