# Intake Schema

RoleAxis intake is the master setup interview. It must gather enough information to search, tailor, apply, pause intelligently, and track applications without guessing.

The intake flow should feel conversational, but the saved data must be structured.

## Intake Principles

- Ask once where safe.
- Ask carefully where sensitive.
- Never infer legal, medical, demographic, military, disability, background, compensation, or attestation answers.
- Let the user choose reuse rules.
- Store answer source, sensitivity, risk, and approval status.
- Keep real user data out of source control.

## Required Intake Sections

### 1. Resume Intake

Purpose: create the truth profile.

Fields:

- Resume file reference.
- Parsed legal name.
- Parsed contact details.
- Parsed work history.
- Parsed education.
- Parsed skills.
- Parsed certifications and licenses.
- Parsed tools and systems.
- Parsed industries.
- Parsed accomplishments.
- Ambiguous items needing confirmation.
- Items the system must never claim.

Default behavior: profile facts from the resume are unverified until the user confirms them.

### 2. Identity And Contact

Fields:

- Legal name.
- Preferred name.
- Email for applications.
- Phone.
- Address.
- Public links.
- Portfolio links.

Default mode: `safe_auto` after confirmation.

### 3. Search Campaign

Fields:

- Target titles.
- Acceptable title variations.
- Industries.
- Seniority.
- Employment types.
- Location list.
- Commute radius.
- Remote, hybrid, onsite preference.
- Salary or hourly minimum.
- Schedule and shift preferences.
- Travel preference.
- Relocation preference.
- Blocked companies.
- Preferred sources.
- Excluded sources.

Default mode: `safe_auto` for search filtering.

### 4. Work Eligibility

Fields:

- Authorized to work in target country.
- Sponsorship required now.
- Sponsorship required in future.
- Minimum age confirmation where required.
- Work permit requirement where relevant.
- Security clearance status where relevant.

Default mode: `ask_once`, except clearance details default to `review_before_submit`.

### 5. Compensation And Availability

Fields:

- Desired salary range.
- Minimum acceptable salary.
- Hourly versus annual preference.
- Salary visibility rules.
- Salary history answer rule.
- Earliest start date.
- Notice period.
- Willingness for overtime.
- Weekend availability.
- Shift availability.

Default mode: compensation fields default to `review_before_submit`.

### 6. Experience Confirmation

Fields:

- Tools and software user can truthfully claim.
- Years of experience by skill.
- Industries worked in.
- Leadership experience.
- Equipment operation.
- Languages.
- Certifications.
- Licenses.
- Physical requirements user is comfortable answering.

Default mode: `safe_auto` when verified, `review_before_submit` when calculated or ambiguous.

### 7. Sensitive And Voluntary Responses

Fields:

- Protected veteran response preference.
- Military service response preference.
- Disability self-identification response preference.
- Accommodation response rule.
- Race and ethnicity response preference.
- Gender response preference.
- Other voluntary demographic response preference.

Default mode: `review_before_submit`.

Required behavior: offer a "do not wish to answer" option where appropriate. Never infer these answers.

### 8. Background, Screening, And Compliance

Fields:

- Background-check consent preference.
- Consumer-report authorization preference.
- Criminal-history answer rule.
- Drug-test consent preference.
- Driving-record consent preference.
- DOT or physical exam requirement handling.
- Arbitration and terms review rule.

Default mode: `manual_only` for criminal history and final legal terms; `review_before_submit` for consent fields.

### 9. References

Fields:

- Reference name.
- Relationship.
- Company/title.
- Email.
- Phone.
- Permission status.
- Allowed use cases.

Default mode: `review_before_submit`.

Required behavior: never submit a reference unless marked approved.

### 10. Account Creation And Vault

Fields:

- Permission to create portal accounts.
- Application email strategy.
- Generated password preference.
- Credential vault storage preference.
- Security question rule.
- MFA notes.
- Account creation portals allowed.
- Account creation portals blocked.

Default mode: account creation is disabled until explicitly approved.

Secret data must be represented by vault references only.

### 11. Final Submission Rules

Fields:

- Automation mode.
- Daily application limit.
- Minimum match score.
- Auto-submit permission.
- Final attestation permission.
- Sensitive-answer pause rules.
- Custom written-answer review rules.
- Unsupported-question behavior.
- Missing-required-qualification behavior.
- Confirmation capture requirement.

Default mode: final attestations are `manual_only`.

## Intake Completion Gate

Intake is complete only when:

- Resume facts have been reviewed.
- Search campaign rules exist.
- Work eligibility questions have explicit answers or pause rules.
- Sensitive voluntary answer preferences are set or marked for review.
- Account creation settings are set.
- Final submission rules are set.
- The user has confirmed the truth rules.
- The system has no required unknown answers for the selected automation mode.

