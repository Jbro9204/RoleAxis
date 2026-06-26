# Automation Rules

RoleAxis should automate as much of the job search as possible while staying inside the user's approved boundaries.

## Automation Modes

### Prepare Only

RoleAxis may search, score, summarize, tailor documents, and draft answers. It must not submit applications.

### Approval Required

RoleAxis may fill applications and prepare submissions. It must pause before final submission.

### Trusted Auto-Apply

RoleAxis may submit applications when every rule passes and no sensitive, unsupported, or blocked item appears.

### High-Volume

RoleAxis may apply broadly while still honoring hard stops for sensitive answers, unsupported claims, blocked companies, legal attestations, portal issues, and missing required qualifications.

## Decision Outcomes

Every job must resolve to one of these outcomes:

- `apply_now`: application can proceed under current rules.
- `prepare_for_review`: materials can be drafted, but user approval is needed.
- `ask_user`: one or more answers are missing.
- `save_for_later`: user or rules defer the job.
- `skip`: job violates user rules or is not worth applying.
- `blocked`: portal, credential, compliance, or technical issue prevents action.

## Search Gates

RoleAxis must skip or review jobs that fail:

- Location or remote preference.
- Salary or hourly minimum.
- Employment type.
- Schedule or shift preference.
- Blocked company.
- Blocked source or portal.
- Required license or certification.
- Required degree.
- Work authorization or sponsorship compatibility.
- Required years of experience that cannot be supported.

## Application Gates

Before filling an application, RoleAxis must confirm:

- The job record is deduplicated.
- The job is still active.
- The application URL is valid.
- The portal type is known or can be inspected.
- The match score meets the active rule.
- Required qualifications are supported or flagged.
- The tailored resume is traceable to verified profile facts.

## Answer Gates

RoleAxis may answer automatically only when:

- The question category is known.
- The answer source is verified.
- The risk level is allowed by the active mode.
- The user has approved reuse where needed.
- The answer does not create a new unsupported claim.

RoleAxis must pause for:

- Disability, accommodation, medical, or physical-condition questions without explicit rules.
- Military, veteran, or protected veteran questions without explicit rules.
- Race, ethnicity, gender, or other voluntary demographic questions without explicit rules.
- Criminal history, background checks, consumer reports, or driving record questions without explicit rules.
- Salary history questions.
- Final attestations, e-signatures, terms, arbitration, or certification statements unless explicitly allowed.
- Any question that asks for a qualification not present in the truth profile.
- Any unknown question category.

## Account Creation Rules

RoleAxis may create a portal account only when:

- Account creation is allowed in automation rules.
- The portal is not blocked.
- The user application email is available.
- Password generation is available.
- A vault reference can be created.
- MFA or security-question requirements can be handled safely.

Application records may store:

- Portal name.
- Login email.
- Account creation status.
- Vault reference.

Application records must not store:

- Plain-text password.
- Security answer.
- Recovery code.
- Token.

## Final Submit Rules

Final submission is allowed only when:

- Active mode permits submission.
- All required fields are complete.
- All answer gates pass.
- Final attestation rules permit submission.
- Confirmation capture is enabled or explicitly waived.
- No portal warning or unresolved validation remains.

After submission, RoleAxis must record:

- Timestamp.
- Job and company.
- Portal URL.
- Resume version.
- Cover letter version if used.
- Submitted answers.
- Confirmation number or proof if available.
- Account creation status.
- Follow-up date.
- Warnings or unresolved risks.

