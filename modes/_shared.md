# System Context -- career-ops

<!-- ============================================================
     THIS FILE IS AUTO-UPDATABLE. Don't put personal data here.
     
     Your customizations go in modes/_profile.md (never auto-updated).
     This file contains system rules, scoring logic, and tool config
     that improve with each career-ops release.
     ============================================================ -->

## Sources of Truth

| File | Path | When |
|------|------|------|
| Firm config | `config/firm.yml` | ALWAYS (firm identity, shortlist policy, comp floor) |
| Consultant CVs | `consultants/{slug}/cv.md` | Per evaluation (one per consultant) |
| Consultant profiles | `consultants/{slug}/profile.yml` | Per evaluation (identity, archetypes, comp targets) |
| Consultant overrides | `consultants/{slug}/_profile.md` (if exists) | Per evaluation (per-consultant framing) |
| Consultant proof points | `consultants/{slug}/article-digest.md` (if exists) | Per evaluation (detailed metrics) |
| Consultant stories | `consultants/{slug}/story-bank.md` (if exists) | Interview prep, Block F |
| Firm-level profile | `modes/_profile.md` | ALWAYS (firm negotiation scripts, location policy) |

**Roster discovery:** Scan `consultants/*/profile.yml` — each directory with a valid `profile.yml` is a consultant.

**RULE: NEVER hardcode metrics from proof points.** Read them from each consultant's cv.md + article-digest.md at evaluation time.
**RULE: For article/project metrics, article-digest.md takes precedence over cv.md.**
**RULE: Read `modes/_profile.md` AFTER this file (firm-level overrides). Then read `consultants/{slug}/_profile.md` (per-consultant overrides).**

---

## Scoring System

The evaluation uses 6 blocks (A-F) with a global score of 1-5:

| Dimension | What it measures |
|-----------|-----------------|
| Match con CV | Skills, experience, proof points alignment |
| North Star alignment | How well the role fits the user's target archetypes (from _profile.md) |
| Comp | Salary vs market (5=top quartile, 1=well below) |
| Cultural signals | Company culture, growth, stability, remote policy |
| Red flags | Blockers, warnings (negative adjustments) |
| **Global** | Weighted average of above |

**Score interpretation:**
- 4.5+ → Strong match, recommend applying immediately
- 4.0-4.4 → Good match, worth applying
- 3.5-3.9 → Decent but not ideal, apply only if specific reason
- Below 3.5 → Recommend against applying (see Ethical Use in CLAUDE.md)

## Roster Evaluation (Consultancy Mode)

When evaluating a JD, score **every** consultant in the roster, then apply the hybrid shortlist rule:

1. **Location Eligibility Check** (BEFORE scoring) — extract location requirements from the JD (see "Location Eligibility" section below). Any consultant who fails the hard check gets an automatic ceiling of 1.0 with note "ineligible: location mismatch".
2. **Mini Block B** — For each `consultants/*/profile.yml`, read their CV + digest + overrides. Compute a score (same 1-5 rubric) with a one-line rationale. Apply the location ceiling if relevant.
3. **Hybrid shortlist** — Read `config/firm.yml` for the policy:
   - `shortlist.policy: hybrid` → Top 1 consultant always + all others scoring ≥ `shortlist.threshold` (default 4.0)
   - If `shortlist.min_score` is set and even the top-1 scores below it → empty shortlist, report says "No consultants met minimum threshold — manual review required"
   - **If all consultants failed location check** → empty shortlist, report says "LOCATION MISMATCH: no consultant eligible to work in {region}"
4. **Full evaluation** — Only for shortlisted consultants: full Block B (match), C (level), E (tailoring), F (STAR+R stories)
5. **Shared blocks** — A (role summary), D (comp), G (legitimacy) are computed once for the JD, not per consultant

**Output:** One report file with shortlist table + shared blocks + per-consultant sections. One PDF per shortlisted consultant. One tracker row per shortlisted consultant.

## Location Eligibility

Many JDs restrict hiring to specific countries or require work authorization the consultants don't have. Check this BEFORE scoring to avoid wasting evaluation effort and producing misleading shortlists.

**Extract from JD (during Block A):**
- Required country/region (e.g., "US", "EU", "Germany", "LATAM")
- Work authorization clause (e.g., "must be authorized to work in the US without sponsorship", "US citizenship required", "Green Card holder")
- Remote scope ("Remote US", "Remote Americas", "Remote Worldwide", "Hybrid {city}", "On-site {city}")

**Cross-reference against each consultant's `profile.yml`:**
- `location.country` — where the consultant lives
- `location.visa_status` — any relevant work authorization (if present)

**Hard blockers (score ceiling = 1.0, verdict SKIP):**

| JD says | Consultant is in | Action |
|---|---|---|
| "Must be US citizen" / "US citizenship required" | Non-US, no US citizenship | SKIP — ineligible |
| "Authorized to work in {country} without sponsorship required" | Different country, no local work authorization | SKIP — ineligible |
| "On-site only, {city}" (no relocation mentioned) | Not in or commutable to that city | SKIP — ineligible |
| "Remote, {specific country} only" | Different country | SKIP — ineligible |

**Soft signals (reduce score, don't eliminate):**

| JD says | Adjustment |
|---|---|
| "Remote, US" without explicit international eligibility | −0.5 (often still possible as contractor) |
| "EST timezone only" and consultant in very different TZ | −0.3 |
| "Hybrid, {city}" where consultant doesn't live there | −0.5 if relocation unclear |
| "Preferred location: {city}" but role is remote-open | 0 (no adjustment — just a preference) |

**Ambiguous cases — err on the side of flagging in notes, not blocking:**
- "Remote, Americas" → LATAM consultants usually eligible. Score normally, flag in notes.
- "US-based preferred" → soft signal, not hard block.
- Location in JD title (e.g., "Senior Engineer, Chicago") but JD body says remote — trust the body.

**Report all location mismatches clearly in the Shortlist table's Rationale column** so the user understands why a consultant was excluded.

## Posting Legitimacy (Block G)

Block G assesses whether a posting is likely a real, active opening. It does NOT affect the 1-5 global score -- it is a separate qualitative assessment.

**Three tiers:**
- **High Confidence** -- Real, active opening (most signals positive)
- **Proceed with Caution** -- Mixed signals, worth noting (some concerns)
- **Suspicious** -- Multiple ghost indicators, user should investigate first

**Key signals (weighted by reliability):**

| Signal | Source | Reliability | Notes |
|--------|--------|-------------|-------|
| Posting age | Page snapshot | High | Under 30d=good, 30-60d=mixed, 60d+=concerning (adjusted for role type) |
| Apply button active | Page snapshot | High | Direct observable fact |
| Tech specificity in JD | JD text | Medium | Generic JDs correlate with ghost postings but also with poor writing |
| Requirements realism | JD text | Medium | Contradictions are a strong signal, vagueness is weaker |
| Recent layoff news | WebSearch | Medium | Must consider department, timing, and company size |
| Reposting pattern | scan-history.tsv | Medium | Same role reposted 2+ times in 90 days is concerning |
| Salary transparency | JD text | Low | Jurisdiction-dependent, many legitimate reasons to omit |
| Role-company fit | Qualitative | Low | Subjective, use only as supporting signal |

**Ethical framing (MANDATORY):**
- This helps users prioritize time on real opportunities
- NEVER present findings as accusations of dishonesty
- Present signals and let the user decide
- Always note legitimate explanations for concerning signals

## Archetype Detection

Classify every offer into one of these types (or hybrid of 2):

| Archetype | Key signals in JD |
|-----------|-------------------|
| AI Platform / LLMOps | "observability", "evals", "pipelines", "monitoring", "reliability" |
| Agentic / Automation | "agent", "HITL", "orchestration", "workflow", "multi-agent" |
| Technical AI PM | "PRD", "roadmap", "discovery", "stakeholder", "product manager" |
| AI Solutions Architect | "architecture", "enterprise", "integration", "design", "systems" |
| AI Forward Deployed | "client-facing", "deploy", "prototype", "fast delivery", "field" |
| AI Transformation | "change management", "adoption", "enablement", "transformation" |

After detecting archetype, read `modes/_profile.md` for firm-level defaults, then each consultant's `consultants/{slug}/_profile.md` for their specific framing and proof points for that archetype.

## Global Rules

### NEVER

1. Invent experience or metrics
2. Modify cv.md or portfolio files
3. Submit applications on behalf of the candidate
4. Share phone number in generated messages
5. Recommend comp below market rate
6. Generate a PDF without reading the JD first
7. Use corporate-speak
8. Ignore the tracker (every evaluated offer gets registered)

### ALWAYS

0. **Cover letter:** If the form allows it, ALWAYS include one. Same visual design as CV. JD quotes mapped to proof points. 1 page max.
1. Read `config/firm.yml`, `modes/_profile.md`, and each consultant's files before evaluating
1b. **First evaluation of each session:** Run `node cv-sync-check.mjs`. If warnings, notify user.
2. Detect the role archetype and adapt framing per consultant's `_profile.md`
3. Cite exact lines from each consultant's CV when matching
4. Use WebSearch for comp and company data
5. Register in tracker after evaluating
6. Generate content in the language of the JD (EN default)
7. Be direct and actionable -- no fluff
8. Native tech English for generated text. Short sentences, action verbs, no passive voice.
8b. Case study URLs in PDF Professional Summary (recruiter may only read this).
9. **Tracker additions as TSV** -- NEVER edit applications.md directly. Write TSV in `batch/tracker-additions/`.
10. **Include `**URL:**` in every report header.**

### Tools

| Tool | Use |
|------|-----|
| WebSearch | Comp research, trends, company culture, LinkedIn contacts, fallback for JDs |
| WebFetch | Fallback for extracting JDs from static pages |
| Playwright | Verify offers (browser_navigate + browser_snapshot). **NEVER 2+ agents with Playwright in parallel.** |
| Read | config/firm.yml, consultants/{slug}/*.md, modes/_profile.md, cv-template.html |
| Write | Temporary HTML for PDF, applications.md, reports .md |
| Edit | Update tracker |
| Canva MCP | Optional visual CV generation. Duplicate base design, edit text, export PDF. Requires `canva_resume_design_id` in profile.yml. |
| Bash | `node generate-pdf.mjs` |

### Time-to-offer priority
- Working demo + metrics > perfection
- Apply sooner > learn more
- 80/20 approach, timebox everything

---

## Professional Writing & ATS Compatibility

These rules apply to ALL generated text that ends up in candidate-facing documents: PDF summaries, bullets, cover letters, form answers, LinkedIn messages. They do NOT apply to internal evaluation reports.

### Avoid cliché phrases
- "passionate about" / "results-oriented" / "proven track record"
- "leveraged" (use "used" or name the tool)
- "spearheaded" (use "led" or "ran")
- "facilitated" (use "ran" or "set up")
- "synergies" / "robust" / "seamless" / "cutting-edge" / "innovative"
- "in today's fast-paced world"
- "demonstrated ability to" / "best practices" (name the practice)

### Unicode normalization for ATS
`generate-pdf.mjs` automatically normalizes em-dashes, smart quotes, and zero-width characters to ASCII equivalents for maximum ATS compatibility. But avoid generating them in the first place.

### Vary sentence structure
- Don't start every bullet with the same verb
- Mix sentence lengths (short. Then longer with context. Short again.)
- Don't always use "X, Y, and Z" — sometimes two items, sometimes four

### Prefer specifics over abstractions
- "Cut p95 latency from 2.1s to 380ms" beats "improved performance"
- "Postgres + pgvector for retrieval over 12k docs" beats "designed scalable RAG architecture"
- Name tools, projects, and customers when allowed
