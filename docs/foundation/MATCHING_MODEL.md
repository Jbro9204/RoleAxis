# Matching Model

RoleAxis matching is deterministic, evidence-led, and explainable. A match score helps prioritize review; it does not prove qualification and never authorizes an unsupported claim.

## Current Source Boundary

Phase Four supports two evidence paths behind the same normalized source contract:

- Manual import records a complete posting supplied by the user. Tracking parameters are removed while job identifiers are preserved.
- Verified public feeds read published roles from supported employer career boards without signing in, submitting, or sharing campaign data.
- The same-origin gateway accepts public careers URLs only from a fixed host allowlist. It is not an arbitrary URL proxy.
- Upstream checks use HTTPS, short timeouts, response-size and role-count limits, per-client request limits, and a brief cache.
- Only the public careers URL crosses the local boundary. Resume facts, intake answers, private compensation rules, scores, and decisions do not.
- Source HTML is converted to inert plain text before it enters the matching pipeline. Scripts and source formatting are never executed.
- Every receipt records the external identifier, canonical posting URL, retrieval time, last-seen time, activity state, and import method.

Every source check creates a durable run record with start and completion times, status, fetched count, new count, updated count, reconciliation count, omitted count, closure count, and a safe error message when needed.

## Normalization

Every imported role is converted to the job schema:

- Company, title, location, and work arrangement.
- Canonical source, portal classification, and external identifier where present.
- Compensation range, currency, and period.
- Required and preferred qualification statements.
- Searchable posting keywords.
- Discovery and update timestamps.

Duplicate checks compare canonical URLs, stable fingerprints, and normalized company-title-location identity. When the same role appears in more than one source, RoleAxis keeps one stable dossier and appends the additional source receipt.

## Freshness And Closure

- A complete successful run may mark a previously observed source receipt inactive when that posting is no longer returned.
- A dossier is marked closed only when every connected live receipt for the role is inactive.
- Truncated runs and runs containing unusable postings never close missing roles.
- Failed runs preserve the prior campaign state and record the failure on the source and run receipt.
- Closed dossiers remain in the campaign record and may reopen if a later complete run observes the posting again.

## Score Dimensions

The current score totals 100 points:

| Dimension | Maximum | Evidence |
| --- | ---: | --- |
| Role alignment | 30 | Configured target titles compared with the published title. |
| Verified skills | 25 | Exact verified profile skills appearing in the posting. |
| Location and format | 15 | Configured locations and remote, hybrid, or onsite preference. |
| Compensation | 15 | Published pay compared with the private campaign floor. |
| Required evidence | 15 | Explicit critical requirements compared conservatively with confirmed profile and intake evidence. |

Each dimension stores its score, maximum, and explanation. The dossier must show all five.

## Conservative Requirement Checks

RoleAxis treats degrees, licenses, certifications, clearances, work authorization, sponsorship, and experience-duration requirements as critical.

- Degree levels require matching confirmed education evidence.
- Years-of-experience requirements require explicit duration evidence. General role similarity is not enough.
- Licenses, certifications, and clearances require specific supporting terms.
- Work authorization and sponsorship use explicit intake answers only.
- An unsupported or ambiguous critical requirement becomes a concern. It is never converted into a positive match by related keywords.

## Outcomes

The score and hard campaign mismatches produce a recommendation:

- `prepare_for_review`: the score meets the user-configured review threshold and no hard location or compensation mismatch exists.
- `ask_user`: the role has meaningful alignment but unresolved evidence or campaign gates need judgment.
- `save_for_later`: the score is below the active threshold or a hard location or compensation mismatch exists.
- `skip`: the user explicitly skips the role and records a reason.

The current source adapter never returns `apply_now`. Application preparation and submission require later verified workflows.

The dossier also accepts `too_low`, `accurate`, or `too_high` match feedback. This feedback is stored locally as user judgment. It does not silently modify the deterministic score.

## Quality And Limitations

- Matching is intentionally transparent rather than predictive or opaque.
- Phrase overlap can miss equivalent terminology and should be improved through controlled taxonomies, not invented evidence.
- Manual imports do not prove that a posting is still active; freshness requires a verified live receipt.
- Public boards can omit fields or cap results. Partial checks are labeled and cannot drive closure.
- A high score is a review aid, not a guarantee of eligibility, interview likelihood, or employment outcome.
- Source adapters, taxonomies, and scoring changes require tests for deduplication, truthfulness, hard gates, and explanation quality.
