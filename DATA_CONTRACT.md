# RoleAxis Data Contract

RoleAxis will begin with file-backed storage and remain ready for a database later. Product logic must depend on these data shapes, not on a specific storage engine.

The repository may contain schemas, safe templates, and non-sensitive examples. Real resumes, application answers, account credentials, sensitive intake responses, generated documents, confirmation screenshots, and user-specific records must stay out of source control.

## Storage Layout

Tracked:

- `data/schemas/`: JSON schemas that define product data shapes.
- `data/templates/`: safe starter records, question sets, and library data without real personal information.
- `local-data/.gitkeep`: keeps the local data folder available without tracking its contents.

Ignored:

- `local-data/*`: local records used during development.
- `*.vault.json`, `*.secret.json`, `*.private.json`: sensitive file patterns.
- `uploads/`, `exports/`, `confirmations/`, `generated-documents/`: user artifacts and generated files.

## Future Database Mapping

The file-backed structures should later map to database tables without changing the product language:

- `profile` maps to users, profiles, work history, education, certifications, skills, links, and truth rules.
- `intake` maps to intake sessions, intake answers, sensitive answer preferences, and approval defaults.
- `automation-rules` maps to search rules, approval rules, submit rules, source controls, and daily limits.
- `intake-question-set` maps to the guided intake prompts shown before any application automation begins.
- `job` maps to discovered jobs, sources, extracted requirements, match records, and review state.
- `source-connection` maps to configured public boards, health state, last checks, and successful-run timestamps.
- `search-run` maps to immutable discovery receipts, result counts, partial states, closures, and safe error records.
- `application` maps to application records, submitted answers, documents used, portal account references, confirmations, and status history.
- `interview` maps to interview records, prep notes, practice sessions, follow-ups, and outcomes.

The first implementation can read and write JSON files. Later implementations can replace the storage adapter with PostgreSQL or another database while keeping these schemas as the contract.

## Sensitivity Model

Every field that can expose personal, legal, medical, demographic, background, compensation, account, or application-submission details must be categorized.

Sensitivity levels:

- `public`: safe for non-sensitive product metadata.
- `internal`: product workflow data that should not be public.
- `personal`: personally identifiable or career-specific information.
- `sensitive`: legal, medical, demographic, military, background, credential, compensation, or attestation data.
- `secret`: passwords, tokens, recovery answers, MFA notes, or credential material.

Secret fields must never be stored in normal records. Store only a vault reference in product records.

## Answer Automation Modes

Every reusable answer must declare how RoleAxis may use it:

- `safe_auto`: answer can be reused automatically from verified information.
- `ask_once`: ask during intake, then reuse until changed.
- `review_before_submit`: prepare the answer but pause before submission.
- `manual_only`: user must answer every time.

Unknown, unsupported, sensitive, legal, medical, demographic, background, military, disability, credential, compensation, and final attestation questions must never be guessed.

## File-Backed Development Rules

- Do not put real user data in `data/templates/`.
- Do not commit files from `local-data/`.
- Do not commit generated resumes, cover letters, confirmations, screenshots, or account records.
- Do not store portal passwords in application records.
- Do not add new product data shapes without updating the relevant schema.
- Do not build UI controls that save data unless the save path is represented in this contract.

## Browser-Local Draft Adapter

The launch and intake workflow uses an encrypted browser-local draft before a production account and database boundary exist.

- Resume bytes and extracted source text are not retained after local processing.
- Confirmed profile facts, intake answers, source connections, search-run receipts, normalized job records, match feedback, review decisions, approval metadata, and campaign state are encrypted before being written to IndexedDB.
- Live source receipts store only public posting provenance and timing. Private profile or campaign evidence is never added to a source request.
- The local encryption key is non-extractable and scoped to the browser workspace.
- The draft adapter does not provide multi-user authentication, synchronization, or backup and must not be represented as a production credential vault.
- Portal passwords, security answers, recovery codes, tokens, and MFA secrets are not accepted by this adapter.
- Clearing the local campaign removes the encrypted draft from the browser.

The browser-local record is a campaign draft, not a replacement for the profile, application, interview, or vault contracts. Production storage must preserve those contracts behind an authenticated service boundary.
