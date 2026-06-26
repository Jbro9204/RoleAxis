# Application Question Library

RoleAxis must anticipate the questions that job applications may ask across job boards, company portals, applicant tracking systems, staffing agencies, government contractors, and industry-specific applications.

The goal is not to answer every question automatically. The goal is to classify every question, know the source of truth, understand the risk, and decide whether the system can proceed or must pause.

## Automation Modes

- `safe_auto`: can be answered automatically from verified profile data.
- `ask_once`: ask during intake, then reuse until the user changes it.
- `review_before_submit`: prepare an answer, but pause before submission.
- `manual_only`: the user must answer every time.

## Sensitivity Levels

- `public`: non-sensitive product metadata.
- `internal`: workflow data that should not be public.
- `personal`: personally identifiable or career-specific information.
- `sensitive`: legal, medical, demographic, military, disability, background, compensation, or attestation data.
- `secret`: passwords, security answers, tokens, recovery codes, or credential material.

## Core Question Categories

| Category | Examples | Source Of Truth | Sensitivity | Default Mode | Required Behavior |
| --- | --- | --- | --- | --- | --- |
| Identity | Legal name, preferred name, former names | Profile | personal | safe_auto | Use verified profile fields. |
| Contact | Email, phone, address | Profile | personal | safe_auto | Use verified contact fields. |
| Address History | Previous addresses, residence duration | Intake | personal | ask_once | Ask only when needed. |
| Work Authorization | Authorized to work, proof of eligibility | Intake | sensitive | ask_once | Ask explicitly. Do not infer. |
| Sponsorship | Sponsorship now or future | Intake | sensitive | ask_once | Ask explicitly. Do not infer. |
| Citizenship | Citizen, national, permanent resident | Intake/manual | sensitive | manual_only | Avoid unless legally required or user-configured. |
| Minimum Age | 18 or older, work permit eligibility | Intake | sensitive | ask_once | Ask explicitly if role requires it. |
| Job Targets | Desired titles, industries, seniority | Intake | internal | safe_auto | Use search rules. |
| Compensation | Desired pay, minimum pay, pay type | Intake/rules | sensitive | review_before_submit | Use configured range and pause when uncertain. |
| Salary History | Current pay, prior pay | Manual | sensitive | manual_only | Do not answer automatically. |
| Availability | Start date, notice period | Intake | personal | ask_once | Reuse with user-approved defaults. |
| Schedule | Full-time, part-time, shift, weekends, overtime | Intake | personal | ask_once | Apply search and screening rules. |
| Location | Commute, relocation, remote, hybrid, onsite | Intake/rules | personal | ask_once | Use campaign settings. |
| Travel | Travel percentage, overnight travel | Intake | personal | ask_once | Pause if outside configured rules. |
| Education | Degree, institution, graduation, GPA | Profile | personal | safe_auto | Use verified resume/profile facts only. |
| Employment History | Employer, title, dates, responsibilities | Profile | personal | safe_auto | Use verified work history only. |
| Gaps | Employment gaps, reason for gap | Intake/manual | sensitive | review_before_submit | Prepare carefully; user approval required. |
| Reason For Leaving | Why leaving or left | Intake/manual | sensitive | review_before_submit | Avoid unsupported or negative phrasing. |
| Skills And Tools | Software, equipment, methodologies | Profile | personal | safe_auto | Only claim verified skills. |
| Years Experience | Years with tools, industries, responsibilities | Profile/calculated | personal | review_before_submit | Calculate conservatively; pause if ambiguous. |
| Certifications | Licenses, certificates, expirations | Profile | personal | safe_auto | Use verified credentials only. |
| Licenses | Professional license, driver's license, CDL | Profile/intake | sensitive | ask_once | Never invent or imply active status. |
| Equipment | Forklift, machinery, POS, warehouse systems | Profile/intake | personal | safe_auto | Use verified experience only. |
| Physical Requirements | Lift weight, stand, climb, DOT physical | Intake/manual | sensitive | review_before_submit | Pause unless explicitly configured. |
| Drug Testing | Consent, ability to pass, timing | Intake/manual | sensitive | review_before_submit | Pause unless explicitly configured. |
| Background Check | Consent, consumer report, credit check | Intake/manual | sensitive | review_before_submit | Use explicit user preference; log approval. |
| Criminal History | Convictions, pending charges | Manual | sensitive | manual_only | Never infer. Prefer manual answer every time. |
| Security Clearance | Clearance level, eligibility, public trust | Profile/intake | sensitive | review_before_submit | Use verified status only. |
| Military Service | Service, branch, veteran status | Intake/manual | sensitive | review_before_submit | Voluntary; never infer. |
| Protected Veteran | VEVRAA classification | Intake/manual | sensitive | review_before_submit | Use explicit preference only. |
| Disability Self-ID | Voluntary disability form options | Intake/manual | sensitive | review_before_submit | Use explicit preference only. |
| Accommodation | Need accommodation for application or job duty | Manual | sensitive | manual_only | Pause unless user has a specific approved response. |
| Demographics | Race, ethnicity, gender, sexual orientation | Intake/manual | sensitive | review_before_submit | Voluntary; never infer. |
| References | Names, emails, phones, relationship | Intake | personal | review_before_submit | Use only approved references. |
| Portfolio Links | Website, LinkedIn, GitHub, work samples | Profile | personal | safe_auto | Include only approved links. |
| Relatives And Conflicts | Relatives at company, conflicts, non-compete | Intake/manual | sensitive | review_before_submit | Pause if unknown. |
| Prior Employment | Former employee, rehire eligibility | Intake/manual | sensitive | review_before_submit | Use explicit answer only. |
| Assessments | Personality, skills tests, work simulations | Manual | sensitive | manual_only | Do not fabricate. Treat as separate workflow. |
| Custom Written Answer | Why this company, challenge, strengths | Profile/intake | internal | review_before_submit | Draft from verified facts; require review by default. |
| Account Creation | Portal account, login email | Intake/rules | sensitive | ask_once | Create only when rules allow. |
| Security Questions | Recovery questions, MFA, backup codes | Vault/manual | secret | manual_only | Store only via vault mechanism. |
| Final Attestation | Signature, certification, terms, arbitration | Manual/rules | sensitive | manual_only | Do not submit unless rules explicitly allow. |
| Confirmation | Confirmation number, receipt, email | Portal capture | internal | safe_auto | Store proof when available. |

## Unknown Question Protocol

When RoleAxis encounters a question that does not match the library:

1. Capture the exact question text, field type, available options, portal, and job record.
2. Classify the likely category.
3. Assign a risk level.
4. Search the profile, intake answers, and automation rules for a verified answer.
5. If unsupported, sensitive, legal, medical, demographic, background, military, disability, secret, compensation, or attestation-related, pause.
6. Ask the user for an answer and reuse preference.
7. Store the pattern for future classification.
8. Log the final answer source and approval state.

## Submission Gate

Before final submission, the application runner must verify:

- Job still matches search rules.
- Required qualifications are not falsely claimed.
- Resume version is traceable to verified profile facts.
- All submitted answers have source, category, risk, and approval status.
- Sensitive answers meet user-configured rules.
- Account creation and credential handling follow vault rules.
- Final attestation is allowed by the active automation mode.
- Confirmation capture is attempted after submission.

