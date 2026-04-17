# Firm Profile Context -- career-ops (consultancy mode)

<!-- ============================================================
     THIS FILE IS THE FIRM-LEVEL PROFILE TEMPLATE.

     Copy to modes/_profile.md and customize for your firm.
     
     Shared across all consultants: negotiation scripts,
     location policy, default archetypes.
     
     Per-consultant overrides go in consultants/{slug}/_profile.md.
     The system reads _shared.md first, then this file (firm-level),
     then each consultant's _profile.md (per-consultant overrides).
     ============================================================ -->

## Default Archetypes

<!-- Replace these with archetypes that match your firm's service areas.
     Per-consultant archetypes in their _profile.md override these defaults. -->

| Archetype | Thematic axes | What they buy |
|-----------|---------------|---------------|
| **AI Platform / LLMOps Engineer** | Evaluation, observability, reliability, pipelines | Someone who puts AI in production with metrics |
| **Agentic Workflows / Automation** | HITL, tooling, orchestration, multi-agent | Someone who builds reliable agent systems |
| **Technical AI Product Manager** | GenAI/Agents, PRDs, discovery, delivery | Someone who translates business to AI product |
| **AI Solutions Architect** | Hyperautomation, enterprise, integrations | Someone who designs end-to-end AI architectures |
| **AI Forward Deployed Engineer** | Client-facing, fast delivery, prototyping | Someone who delivers AI solutions to clients fast |
| **AI Transformation Lead** | Change management, adoption, org enablement | Someone who leads AI transformation in an org |

## Firm-Level Negotiation Scripts

<!-- Adapt to your firm's positioning and language -->

**Salary expectations:**
> "Based on market data for this role, we're targeting [RANGE]. We're flexible on structure -- what matters is the total package and the opportunity."

**Geographic discount pushback:**
> "Our consultants work output-based, not location-based. Their track record doesn't change based on postal code."

**When offered below target:**
> "We're comparing with opportunities in the [higher range]. We're drawn to [company] because of [reason]. Can we explore [target]?"

## Firm-Level Location Policy

<!-- Adapt to your firm's standard availability -->

**In forms:**
- Follow each consultant's actual availability from their profile.yml
- Specify timezone overlap in free-text fields

**In evaluations (scoring):**
- Remote dimension for hybrid outside consultant's country: score **3.0** (not 1.0)
- Only score 1.0 if JD says "must be on-site 4-5 days/week, no exceptions"

## Comp Targets

<!-- General guidance for all consultants — individual targets are in their profile.yml -->

**General guidance:**
- Use WebSearch for current market data (Glassdoor, Levels.fyi, Blind)
- Frame by role title, not by skills
- Contractor rates are typically 30-50% higher than employee base
- If firm.yml has a `compensation.floor`, no offer below that floor is acceptable regardless of consultant
