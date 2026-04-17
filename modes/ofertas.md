# Mode: ofertas — Multi-Offer Comparison (Consultancy)

Compare multiple offers using a weighted scoring matrix.

## Two Sub-Modes

### Mode 1: "Compare for consultant X"

When the user says "compare these offers for alice":
- Score each offer from alice's perspective only
- Use alice's `cv.md`, `profile.yml`, `_profile.md` as source of truth
- Output: ranked list of offers by alice's weighted score

### Mode 2: "Compare across the roster" (default)

When the user says "compare these offers" without specifying a consultant:
- For each offer × each consultant, compute the match score
- Output: matrix view showing best-fit pairings

**Matrix format:**

| Offer | alice | bob | carol | Best fit |
|-------|-------|-----|-------|----------|
| Acme — Senior AI Eng | 4.6 | 4.1 | 3.2 | alice |
| Stripe — Platform Lead | 3.8 | 4.5 | 2.9 | bob |
| Datadog — ML Ops | 4.2 | 3.9 | 4.0 | alice |

Highlight the best consultant-to-offer pairing and recommend assignment.

## Scoring Matrix (per offer × consultant)

| Dimension | Weight | Criteria 1-5 |
|-----------|--------|--------------|
| North Star alignment | 25% | 5=exact target role, 1=unrelated |
| CV match | 15% | 5=90%+ match, 1=<40% match |
| Level (senior+) | 15% | 5=staff+, 4=senior, 3=mid-senior, 2=mid, 1=junior |
| Estimated comp | 10% | 5=top quartile vs consultant's target, 1=below market |
| Growth trajectory | 10% | 5=clear path to next level, 1=dead end |
| Remote quality | 5% | 5=full remote async, 1=onsite only |
| Company reputation | 5% | 5=top employer, 1=red flags |
| Tech stack modernity | 5% | 5=cutting edge AI/ML, 1=legacy |
| Speed to offer | 5% | 5=fast process, 1=6+ months |
| Cultural signals | 5% | 5=builder culture, 1=bureaucratic |

For each offer × consultant: score per dimension, weighted total.
Final ranking + recommendation with time-to-offer considerations.

Ask the user for the offers if not in context. Can be text, URLs, or references to offers already evaluated in the tracker.
