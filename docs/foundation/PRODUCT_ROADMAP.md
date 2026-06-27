# Product Roadmap

This roadmap keeps RoleAxis moving in disciplined slices. Each phase must produce usable, verified work and must respect the build guide.

## Phase One: Foundation

Goal: lock the product standards, research base, data contract, automation rules, and UX architecture before building the app.

Deliverables:

- Build guide.
- README and product description.
- Brand assets.
- File-backed data contract.
- Application question library.
- Intake schema.
- Automation rules.
- UX architecture.
- Safe templates and schemas.

Exit criteria:

- Repo has no untracked foundation files.
- Sensitive data boundaries are defined.
- Question categories and pause rules are documented.
- The first app slice can be built without inventing product behavior.

## Phase Two: Application Shell

Goal: create the premium multi-page RoleAxis experience without fake workflows.

Deliverables:

- App scaffold.
- Brand system.
- Routing.
- Launch and intake frame.
- Command center frame.
- Review queue frame.
- Applied jobs frame.
- Documents frame.
- Credential vault frame.
- Interviews frame.
- Settings and rules frame.

Exit criteria:

- Pages are real surfaces with states, not empty navigation.
- Visual quality gate passes desktop, tablet, and mobile checks.
- No dead controls.

## Phase Three: Resume And Intake

Goal: let the user upload a resume, review parsed profile information, and complete guided intake.

Deliverables:

- Resume upload.
- File-backed profile draft.
- Parsed profile review UI.
- Intake session UI.
- Sensitive answer preference flow.
- Automation settings flow.

Exit criteria:

- Intake produces valid local records.
- Unknown or sensitive answers are handled conservatively.
- No real user data is committed.

## Phase Four: Job Discovery And Matching

Status: complete.

Goal: discover jobs, normalize records, score fit, and create reviewable job dossiers.

Deliverables:

- Search settings.
- Source adapter boundary.
- Job normalization.
- Match scoring.
- Dedupe logic.
- Job detail dossier.

Exit criteria:

- Found jobs become structured records.
- Match reasoning is explainable.
- Unsupported requirements are flagged.

## Phase Five: Document Tailoring

Goal: create tailored application materials from verified profile facts.

Deliverables:

- Resume versioning.
- Cover letter drafts.
- Answer drafts.
- Truth trace review.
- Document export path.

Exit criteria:

- Every tailored claim traces to verified profile data.
- User can review changes before use.

## Phase Six: Assisted Application Runner

Goal: fill supported applications with approval checkpoints.

Deliverables:

- Portal inspection.
- Form field mapping.
- Question classification.
- Answer gate enforcement.
- Upload handling.
- Final submission pause.
- Confirmation capture.

Exit criteria:

- Supported portals work end to end in assisted mode.
- Unknown questions pause and become library candidates.

## Phase Seven: Vault And Account Creation

Goal: safely support portal accounts and credential references.

Deliverables:

- Credential vault boundary.
- Password generation.
- Portal account records.
- MFA notes.
- Security question handling policy.

Exit criteria:

- Application records never store plain-text secrets.
- Account creation follows user rules.

## Phase Eight: Interview Workflow

Goal: turn submitted applications into interview prep workspaces.

Deliverables:

- Interview pipeline.
- Job-specific prep.
- Practice questions.
- Follow-up drafts.
- Outcome tracking.

Exit criteria:

- Interview prep uses the exact job and submitted materials.
- Follow-up workflow is tracked.

