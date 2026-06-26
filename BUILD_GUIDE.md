# RoleAxis Build Guide

RoleAxis is a premium job-search automation platform. It helps users turn a job search into a managed campaign: upload a resume, complete a guided intake, discover matching roles, tailor materials truthfully, submit applications under configurable rules, track every result, and prepare for interviews from the exact materials submitted.

This guide is the standard for every build decision. If a feature conflicts with this guide, the guide wins until it is deliberately updated.

## Product Identity

- Product name: RoleAxis.
- Product promise: Your job search, aligned and automated.
- Brand idea: career direction, role alignment, targeted movement, and controlled momentum.
- User feeling: calm, capable, organized, and in command.
- Visual cues: axis, compass, signal, trajectory, review desk, application record, and campaign progress.
- Tone: precise, confident, private, direct, and useful.
- Mission line: When applying feels like too much, RoleAxis helps carry the process.

RoleAxis must feel like a serious paid product. It should not feel like a template, prototype, generic admin panel, or novelty tool.

## Human Impact Standard

RoleAxis exists to help people regain control of the job search. Every workflow should reduce overwhelm, protect user dignity, increase clarity, and move the user toward meaningful employment without compromising truth, privacy, or trust.

Product decisions must treat job searching as emotionally demanding, repetitive, and high stakes. RoleAxis should make the user feel supported and capable, not judged, rushed, or reduced to a metric.

Required behavior:

- Treat rejections, skips, and blocked applications as workflow information, not personal failure.
- Explain why the system matched, paused, skipped, changed, or recommended something.
- Keep next steps clear and manageable.
- Reduce repetitive effort without hiding important decisions.
- Make sensitive questions feel controlled and respectful.
- Keep user language calm, direct, and reassuring.
- Prioritize meaningful employment outcomes over empty application volume.
- Design for users who are tired, stressed, or discouraged.

## Core Product

RoleAxis is automation-first and conversation-controlled.

The platform must be able to:

- Parse an uploaded resume into structured profile data.
- Ask a complete intake interview before applying anywhere.
- Search for jobs by role, location, remote status, salary, schedule, industry, seniority, and source.
- Score and summarize found roles.
- Tailor resumes and application answers based on verified user information.
- Fill job applications where technically possible.
- Create portal accounts when allowed by user rules.
- Generate strong unique passwords and store them securely.
- Submit applications automatically when the job and form pass user-defined rules.
- Pause for approval when a rule, missing answer, sensitive question, portal issue, or risk threshold requires it.
- Log every application in an Applied section.
- Move active opportunities into an Interviews section when the user gets an interview.
- Support interview prep using the job description, submitted resume, submitted answers, company notes, and application history.

The chatbot is the control layer. The dashboard is the operating record. The automation engine does the work.

## Non-Negotiable Quality Standard

No shortcuts. No fake success paths. No dead controls. No unfinished surfaces hidden behind polished copy.

A feature is not complete unless it has:

- Real user workflow value.
- Real state and data handling.
- Loading, empty, error, blocked, and success states where relevant.
- Validation and recovery paths.
- Clear user control points.
- Verification or tests appropriate to the risk.
- Professional naming and structure.
- No placeholder-only implementation.
- No misleading UI that suggests an integration or action works when it does not.

The standard is not "it appears on screen." The standard is "a user could trust this with their job search."

## Source Presentation Standard

The repository must read like a professional product codebase.

- Do not include tool signatures, transcript fragments, scaffold comments, or creator-attribution text.
- Do not use novelty names, demo scaffolding names, or throwaway helper names.
- Do not over-comment obvious code.
- Do not expose provider-specific naming in user-facing UI, comments, docs, or general service boundaries.
- Use neutral product names such as `resumeParser`, `profileBuilder`, `matchingEngine`, `applicationRunner`, `credentialVault`, `activityLog`, and `interviewPrep`.
- Environment and configuration names should describe capabilities, not vendors.
- Commit messages should describe product changes in normal engineering language.

Private implementation details must stay behind clean service boundaries.

## Automation Rules

RoleAxis should automate aggressively inside user-approved boundaries.

Automation modes:

- Prepare only: search, score, tailor, and draft without submitting.
- Approval required: fill applications and pause before submit.
- Trusted auto-apply: submit only when all rules pass.
- High-volume mode: apply broadly while still pausing for sensitive, unsupported, or risky answers.

Auto-apply rules must support:

- Minimum match score.
- Minimum salary or hourly rate.
- Allowed locations and remote status.
- Accepted role titles and industries.
- Blocked companies and sources.
- Maximum applications per day.
- Account creation permission.
- Portal allowlist or denylist.
- Final submit permission.
- Sensitive-question handling.
- Missing-qualification behavior.
- Custom written-answer behavior.
- Resume tailoring limits.

Automation must stop when it encounters unknown risk, unsupported claims, sensitive answers without presets, final attestations outside user rules, blocked portals, or form behavior that cannot be verified.

## Truthfulness Rule

RoleAxis may optimize presentation. It must not invent facts.

Allowed:

- Reorder relevant skills.
- Rephrase real experience.
- Emphasize matching accomplishments.
- Mirror job language when it reflects verified experience.
- Create targeted summaries and cover letters.
- Remove unrelated details from tailored versions.

Not allowed:

- Invent degrees, licenses, certifications, employers, job titles, dates, tools, responsibilities, legal status, clearances, or years of experience.
- Inflate qualifications.
- Answer sensitive questions by inference.
- Claim unsupported requirements to pass screening.

Every tailored document must be traceable back to the user's truth profile.

## Intake Standard

Before applying anywhere, RoleAxis must collect the information needed to answer common application questions quickly and safely.

The guided intake must cover:

- Legal name, preferred name, contact information, and address.
- Resume details, work history, education, certifications, licenses, skills, tools, industries, accomplishments, and constraints.
- Target job titles, industries, seniority, location, commute radius, remote preference, salary range, schedule, shift, overtime, travel, relocation, and dealbreakers.
- Work authorization and sponsorship needs.
- Start date and availability.
- Driver license, CDL, equipment operation, physical requirements, and role-specific eligibility where relevant.
- Background check, criminal history, drug testing, and security clearance preferences where legally and contextually appropriate.
- Military service and protected veteran response preference.
- Disability self-identification response preference.
- Accommodation preferences.
- Demographic voluntary response preferences.
- References and permission to use each reference.
- Portfolio, LinkedIn, GitHub, personal website, and other links.
- Account creation permission, email strategy, password storage preference, and MFA notes.
- Final submission and attestation rules.
- Approval defaults for sensitive, legal, medical, demographic, background, compensation, and custom written questions.

Sensitive answers must come from explicit user input. They must never be inferred from a resume.

## Application Question Research

Before implementing application automation, RoleAxis must maintain a researched question library. The library must cover job boards, employer portals, staffing portals, federal contractor forms, industry-specific applications, and common applicant tracking systems.

Research targets include:

- LinkedIn Easy Apply.
- Indeed.
- ZipRecruiter.
- Glassdoor.
- Workday.
- Greenhouse.
- Lever.
- SmartRecruiters.
- iCIMS.
- Taleo and Oracle Recruiting.
- ADP Recruiting.
- UKG.
- Paycom.
- Paylocity.
- BambooHR.
- JazzHR.
- Jobvite.
- GovernmentJobs and NeoGov.
- USAJobs-style applications.
- Staffing agency portals.
- Retail, warehouse, logistics, healthcare, driver, education, security, trades, and licensed-role applications.

The question library must track:

- Category.
- Example phrasings.
- Expected answer type.
- Source of truth.
- Risk level.
- Auto-answer eligibility.
- Review requirement.
- Logging requirement.
- Notes for legal or compliance sensitivity.

Question categories must include:

- Identity and contact.
- Address and address history.
- Work authorization and sponsorship.
- Education.
- Employment history.
- Gaps and reason for leaving.
- Salary expectations and salary history where permitted.
- Availability, schedule, shift, weekends, overtime, travel, commute, relocation, and remote preference.
- Skills, tools, software, years of experience, equipment, licenses, and certifications.
- Knockout requirements.
- Military service, veteran status, and protected veteran classifications.
- Disability self-identification and accommodation.
- Voluntary demographic questions.
- Criminal history, background checks, and security clearance.
- Drug testing and physical requirements.
- References.
- Portfolio and social links.
- Assessments and work-style questions.
- Custom written responses.
- Final attestations, e-signatures, arbitration, terms, and privacy consent.
- Account creation, security questions, MFA, and password handling.

When the system sees an unknown question, it must classify it, assign a risk level, request user input when needed, and store the new pattern for future handling.

## Answer Risk Model

Every application answer must have an automation mode:

- `safe_auto`: can be answered automatically from verified profile data.
- `ask_once`: ask during intake, then reuse.
- `review_before_submit`: prepare the answer but pause before final submission.
- `manual_only`: user must answer each time.

Every submitted answer must log:

- Original question text.
- Detected category.
- Submitted answer.
- Source of answer.
- Confidence.
- Risk level.
- Approval status.
- Timestamp.

Sensitive, legal, medical, demographic, background, military, disability, and final attestation answers require explicit user configuration before reuse.

## Applied Jobs Record

Every application must create a complete record.

Required fields:

- Company.
- Role title.
- Location.
- Salary or hourly range.
- Source.
- Application URL.
- Portal type.
- Date and time applied.
- Automation mode used.
- Match score and match reasoning.
- Resume version used.
- Cover letter version used.
- Application answers submitted.
- Account created status.
- Login email.
- Credential vault reference.
- Confirmation number or receipt when available.
- Screenshot or saved confirmation when available.
- Current status.
- Follow-up date.
- Notes, warnings, and blockers.

Passwords must not be displayed or stored as plain text in the Applied record.

## Interview Workflow

When an application becomes an interview, the job must move or copy into the Interviews section.

Interview records must retain:

- Original job description.
- Submitted resume.
- Submitted cover letter.
- Submitted application answers.
- Company notes.
- Match analysis.
- Known concerns or gaps.
- Interview date, time, format, contacts, and location.
- Prep notes.
- Practice questions.
- User responses.
- Follow-up message drafts.
- Outcome.

Interview prep must be specific to the role and submitted materials.

## Security And Privacy

RoleAxis handles sensitive personal data. Security is part of the product, not an add-on.

Requirements:

- Encrypt credentials and sensitive stored answers.
- Do not store portal passwords in plain text.
- Do not log secrets.
- Separate credential vault records from application summaries.
- Support export and deletion of user data.
- Minimize third-party sharing.
- Make storage behavior explicit.
- Treat resumes, application answers, military status, disability status, demographic answers, background information, and account credentials as sensitive.
- Use least-privilege access for integrations.

If a design choice exposes unnecessary user risk, choose a safer design.

## Product Experience Standard

RoleAxis must not use a generic single-sidebar admin layout as the whole experience. Navigation may exist, but the app must be workflow-led.

Required product surfaces:

- Launch and intake.
- Command center.
- Search console.
- Review queue.
- Applied jobs.
- Job detail dossier.
- Documents.
- Credential vault.
- Interviews.
- Settings and rules.

Each surface must have a clear job:

- Intake feels like a guided setup session.
- Command center shows campaign status and urgent attention items.
- Search console controls discovery.
- Review queue supports fast decisions.
- Applied jobs acts as the record of truth.
- Job detail acts as an application dossier.
- Documents manages master and tailored materials.
- Credential vault manages portal access safely.
- Interviews acts as a preparation studio.
- Settings controls automation boundaries.

No page should exist only to fill space.

## Visual Quality Gate

Every screen must be visually reviewed before completion.

Color:

- No washed-out palette.
- No low-contrast text.
- No generic all-blue or all-purple dashboard look.
- Use deep navy, teal, crisp neutrals, and purposeful accent colors inspired by the RoleAxis logo.
- Status colors must be readable and meaningful.
- Backgrounds, surfaces, borders, text, and actions must have clear hierarchy.

Typography:

- Use premium, readable typography.
- Avoid oversized type inside dense workflow areas.
- Avoid tiny low-contrast secondary text.
- Maintain clear hierarchy for page titles, records, metadata, forms, and actions.
- Text must not overflow buttons, cards, navigation, tables, or mobile layouts.

Layout:

- No nested card clutter.
- No oversized empty dashboards.
- No cramped forms.
- No dead-looking surfaces.
- Match density to task: guided flows can breathe; review queues should be efficient.
- Use stable dimensions for repeated items, controls, and workflow panels.

Components:

- Buttons need default, hover, active, disabled, loading, and focus states.
- Forms need labels, validation, help text where needed, and error states.
- Lists and tables need scanning, filtering or sorting where relevant, empty states, and overflow handling.
- Modals, drawers, and review panels must feel intentional.

Responsive checks:

- Verify desktop, tablet, and mobile layouts.
- No overlapping text.
- No clipped buttons.
- No incoherent horizontal scroll.
- Critical actions must remain reachable.

Visual verification is required before marking a UI feature done.

## Technical Architecture

Use clean boundaries:

- Resume parsing.
- Profile and truth record.
- Intake question engine.
- Job discovery.
- Job normalization.
- Matching and scoring.
- Document tailoring.
- Application form mapping.
- Application runner.
- Approval workflow.
- Credential vault.
- Applied jobs tracker.
- Interview prep.
- Notifications.
- Audit log.
- Settings and rules.

Each module must have clear inputs, outputs, error states, and ownership.

## Definition Of Done

A change is done only when:

- It fulfills the real workflow.
- It respects automation and truthfulness rules.
- It handles sensitive data correctly.
- It has no placeholder behavior masquerading as finished work.
- It has relevant verification.
- It has responsive UI checks when UI is touched.
- It has visual quality review when UI is touched.
- It has no dead actions.
- It has no source presentation issues.
- It is committed promptly with a clear message.

RoleAxis should be built like a product people can trust with one of the most stressful parts of their life. Every detail should reflect that.
