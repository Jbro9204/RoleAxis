# UX Architecture

RoleAxis must feel like a premium job-search operations product. It must not look or behave like a generic admin panel.

The user experience is workflow-led: each page exists because it supports a real stage of the job campaign.

## Navigation Model

RoleAxis uses a command-center model:

- The user can always see the current campaign state.
- Urgent approvals surface first.
- Search, review, application, and interview work have separate focused surfaces.
- Conversation is present where it helps guide decisions, but structured pages carry the records.

Navigation should support movement through the campaign, not just a static sidebar.

## Core Surfaces

### Launch And Intake

Purpose: start a campaign, upload a resume, review parsed facts, and complete intake.

Required states:

- No resume uploaded.
- Resume parsing.
- Profile review needed.
- Intake in progress.
- Intake complete.
- Intake blocked by sensitive missing answers.

### Command Center

Purpose: show campaign status and the next best actions.

Required content:

- Active automation mode.
- Today's search and application activity.
- Review queue count.
- Blocked items.
- Recent submissions.
- Upcoming interviews.
- Follow-up reminders.

### Search Console

Purpose: control job discovery.

Required content:

- Target roles.
- Locations and remote settings.
- Salary rules.
- Sources.
- Blocked companies.
- Search run history.
- Search quality feedback.

### Review Queue

Purpose: approve, edit, skip, or block application candidates quickly.

Required content:

- Job summary.
- Match score and reasoning.
- Salary/location/schedule fit.
- Missing or risky answers.
- Resume changes.
- Application preview.
- Actions: approve, edit, skip, save, block company.

### Applied Jobs

Purpose: serve as the record of truth.

Required content:

- Company.
- Role.
- Submitted date.
- Portal.
- Resume version.
- Cover letter version.
- Account status.
- Confirmation proof.
- Current status.
- Follow-up date.

### Job Detail Dossier

Purpose: show the complete record for one opportunity.

Required content:

- Original job description.
- Extracted requirements.
- Match analysis.
- ATS keywords.
- Tailored materials.
- Submitted answers.
- Portal notes.
- Activity timeline.

### Documents

Purpose: manage master and tailored materials.

Required content:

- Master resume.
- Resume versions.
- Cover letters.
- Answer drafts.
- Export history.
- Truth trace for tailored claims.

### Credential Vault

Purpose: manage portal account references safely.

Required content:

- Portal.
- Login email.
- Account created date.
- Vault reference.
- MFA notes.
- Status.

Plain-text secrets must never render in normal application records.

### Interviews

Purpose: prepare for interviews from real application history.

Required content:

- Interview schedule.
- Company and role context.
- Submitted resume and answers.
- Likely topics.
- Practice questions.
- Notes.
- Follow-up drafts.
- Outcome.

### Settings And Rules

Purpose: control automation.

Required content:

- Automation mode.
- Match score threshold.
- Daily application limit.
- Source and portal rules.
- Sensitive answer defaults.
- Account creation permissions.
- Final submission rules.
- Privacy and storage settings.

## Visual Quality Requirements

- Use the RoleAxis navy and teal identity with crisp neutral surfaces.
- Do not use washed-out colors.
- Do not use generic gradient-heavy dashboard styling.
- Do not rely on stat cards as the whole interface.
- Do not nest cards inside cards.
- Use icons where they make controls faster to scan.
- Dense workflow areas should be efficient, not cramped.
- Guided flows should feel calm and focused.
- Every screen needs loading, empty, error, blocked, and success states where relevant.
- Desktop, tablet, and mobile layouts must be checked before completion.

## Interaction Rules

- Primary actions must be obvious.
- Risky actions need clear confirmation.
- Approval screens must explain what changed and why.
- Skipped jobs should collect a reason when useful.
- Blocked questions must preserve the exact original question.
- The system must never hide why it paused.
- The user should always know what has been found, prepared, submitted, and blocked.

