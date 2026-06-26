# Matching Model

RoleAxis matching is deterministic, evidence-led, and explainable. A match score helps prioritize review; it does not prove qualification and never authorizes an unsupported claim.

## Current Source Boundary

The first supported adapter is manual job-posting import.

- The user supplies the original URL, published role details, and complete posting text.
- RoleAxis records the canonical source URL but does not fetch, scrape, sign in to, or interact with the source.
- Tracking parameters are removed while job identifiers are preserved.
- The posting is stored as plain text inside the encrypted campaign draft. Source HTML and scripts are never executed.
- Each import receives a stable fingerprint based on canonical source and normalized role identity.

Network source adapters must implement the same normalized output and provenance contract before they can appear as active integrations.

## Normalization

Every imported role is converted to the job schema:

- Company, title, location, and work arrangement.
- Canonical source, portal classification, and external identifier where present.
- Compensation range, currency, and period.
- Required and preferred qualification statements.
- Searchable posting keywords.
- Discovery and update timestamps.

Duplicate checks compare canonical URLs, stable fingerprints, and normalized company-title-location identity.

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

## Quality And Limitations

- Matching is intentionally transparent rather than predictive or opaque.
- Phrase overlap can miss equivalent terminology and should be improved through controlled taxonomies, not invented evidence.
- Manual imports do not prove that a posting is still active.
- A high score is a review aid, not a guarantee of eligibility, interview likelihood, or employment outcome.
- Source adapters, taxonomies, and scoring changes require tests for deduplication, truthfulness, hard gates, and explanation quality.
