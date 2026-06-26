import { Check, Info, LockKeyhole, Plus, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import type { IntakeQuestion, IntakeValue } from "../types";

type Choice = { label: string; value: string | boolean; detail?: string };

const choiceSets: Record<string, Choice[]> = {
  "search.remote_preference": [
    { label: "Remote", value: "remote", detail: "Only roles designed for remote work" },
    { label: "Hybrid", value: "hybrid", detail: "A mix of onsite and remote work" },
    { label: "Onsite", value: "onsite", detail: "Work performed at the employer location" },
    { label: "Any", value: "any", detail: "Let fit and commute rules decide" }
  ],
  "work_authorization.us_authorized": [
    { label: "Yes", value: true },
    { label: "No", value: false },
    { label: "Ask me for each role", value: "manual_review" }
  ],
  "sponsorship.requires_now_or_future": [
    { label: "Yes", value: true },
    { label: "No", value: false },
    { label: "Ask me for each role", value: "manual_review" }
  ],
  "eligibility.minimum_age": [
    { label: "Confirm when required", value: "confirm_when_required" },
    { label: "Ask me each time", value: "manual_review" }
  ],
  "military.protected_veteran_response": [
    { label: "I’ll answer each time", value: "manual_review" },
    { label: "Decline to answer when available", value: "decline_when_available" },
    { label: "Save a response later", value: "needs_private_answer" }
  ],
  "disability.self_identification_response": [
    { label: "I’ll answer each time", value: "manual_review" },
    { label: "Decline to answer when available", value: "decline_when_available" },
    { label: "Save a response later", value: "needs_private_answer" }
  ],
  "demographic.response_preferences": [
    { label: "I’ll answer each time", value: "manual_review" },
    { label: "Decline to answer when available", value: "decline_when_available" },
    { label: "Use saved choices after review", value: "review_saved_preferences" }
  ],
  "background.criminal_history_rule": [
    { label: "Always ask me", value: "manual_only", detail: "RoleAxis will preserve the original question and pause." }
  ],
  "background.consumer_report_consent": [
    { label: "Always review before consent", value: "review_before_consent" },
    { label: "Ask me each time", value: "manual_only" }
  ],
  "account_creation.allow_portal_accounts": [
    { label: "Allow with review", value: true, detail: "Pause before creating any new portal account" },
    { label: "Do not create accounts", value: false },
    { label: "Decide by portal", value: "portal_rules" }
  ],
  "submission.automation_mode": [
    { label: "Prepare only", value: "prepare_only", detail: "Search, score, and draft. Never submit." },
    { label: "Approval required", value: "approval_required", detail: "Prepare applications and pause before submit." },
    { label: "Trusted auto-apply", value: "trusted_auto_apply", detail: "Submit only when every configured rule passes." },
    { label: "High volume", value: "high_volume", detail: "Broader reach with the same hard safety stops." }
  ],
  "submission.final_attestation_rule": [
    { label: "Keep attestations manual", value: "manual_only", detail: "RoleAxis will never sign or certify on your behalf." }
  ]
};

const multiChoiceSets: Record<string, string[]> = {
  "search.schedule": ["Weekdays", "Evenings", "Overnight", "Weekends", "Flexible", "Rotating shifts"]
};

const listQuestions = new Set([
  "search.target_titles",
  "search.locations",
  "eligibility.licenses",
  "account_creation.allowed_portals"
]);

const contextCopy: Record<string, string> = {
  "contact.legal_name": "Used only where an application explicitly asks for your legal name.",
  "contact.application_email": "This becomes the contact address on applications and portal accounts.",
  "search.target_titles": "These titles steer discovery; close title variations can be reviewed later.",
  "search.minimum_compensation": "This is a private floor for filtering, not a salary answer RoleAxis will submit automatically.",
  "work_authorization.us_authorized": "This is a legal eligibility answer. It must come directly from you.",
  "sponsorship.requires_now_or_future": "Employers phrase sponsorship questions differently. RoleAxis preserves your explicit rule.",
  "submission.automation_mode": "The mode sets the outer boundary. Individual risk gates can always force a pause.",
  "submission.final_attestation_rule": "Attestations can carry legal meaning. The conservative default is manual-only."
};

export function hasIntakeValue(value: IntakeValue | undefined) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function ListField({ value, onChange, placeholder }: { value: IntakeValue | undefined; onChange: (value: IntakeValue) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const items = Array.isArray(value) ? value.map(String) : [];

  function addItem() {
    const item = draft.trim();
    if (!item || items.some((existing) => existing.toLowerCase() === item.toLowerCase())) return;
    onChange([...items, item]);
    setDraft("");
  }

  return (
    <div className="listField">
      <div className="tokenList">
        {items.map((item) => (
          <span key={item} className="answerToken">
            {item}
            <button type="button" onClick={() => onChange(items.filter((existing) => existing !== item))} aria-label={`Remove ${item}`}>
              <X size={13} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <div className="listInput">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
        />
        <button type="button" onClick={addItem} disabled={!draft.trim()}><Plus size={16} aria-hidden="true" /> Add</button>
      </div>
    </div>
  );
}
function ChoiceField({ choices, value, onChange }: { choices: Choice[]; value: IntakeValue | undefined; onChange: (value: IntakeValue) => void }) {
  return (
    <div className={`choiceField ${choices.length > 3 ? "compact" : ""}`}>
      {choices.map((choice) => {
        const selected = value === choice.value;
        return (
          <button key={String(choice.value)} className={selected ? "choiceOption selected" : "choiceOption"} type="button" onClick={() => onChange(choice.value)}>
            <span className="choiceMarker">{selected ? <Check size={15} aria-hidden="true" /> : null}</span>
            <span><strong>{choice.label}</strong>{choice.detail ? <small>{choice.detail}</small> : null}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceField({ options, value, onChange }: { options: string[]; value: IntakeValue | undefined; onChange: (value: IntakeValue) => void }) {
  const selected = Array.isArray(value) ? value.map(String) : [];
  return (
    <div className="multiChoiceField">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            className={active ? "selected" : ""}
            type="button"
            onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}
          >
            <span>{active ? <Check size={14} aria-hidden="true" /> : null}</span>{option}
          </button>
        );
      })}
    </div>
  );
}

export function IntakeQuestionField({
  onChange,
  question,
  value
}: {
  onChange: (value: IntakeValue) => void;
  question: IntakeQuestion;
  value: IntakeValue | undefined;
}) {
  const choices = choiceSets[question.key];
  const multiChoices = multiChoiceSets[question.key];
  const listField = listQuestions.has(question.key);
  const isCompensation = question.key === "search.minimum_compensation";
  const isEmail = question.key === "contact.application_email";
  const isPhone = question.key === "contact.phone";
  const sensitive = question.sensitivity === "sensitive" || question.riskLevel === "restricted";

  return (
    <div className="questionStage">
      <div className="questionProtocol">
        <span className={`riskSignal ${question.riskLevel}`}>
          {sensitive ? <ShieldAlert size={14} aria-hidden="true" /> : <Info size={14} aria-hidden="true" />}
          {question.riskLevel === "restricted" ? "Explicit control" : `${question.riskLevel} risk`}
        </span>
        <span>{question.automationMode.replaceAll("_", " ")}</span>
      </div>
      <h2>{question.prompt}</h2>
      <p className="questionContext">{contextCopy[question.key] ?? "Your answer becomes a campaign rule and remains reviewable before it is used."}</p>

      <div className="answerSurface">
        {choices ? <ChoiceField choices={choices} value={value} onChange={onChange} /> : null}
        {multiChoices ? <MultiChoiceField options={multiChoices} value={value} onChange={onChange} /> : null}
        {listField ? (
          <ListField
            value={value}
            onChange={onChange}
            placeholder={question.key.includes("title") ? "Add a target title" : question.key.includes("location") ? "Add a city, state, or region" : question.key.includes("portal") ? "Add a portal name" : "Add a verified license"}
          />
        ) : null}
        {!choices && !multiChoices && !listField ? (
          <label className={`textAnswer ${isCompensation ? "currency" : ""}`}>
            <span>{isCompensation ? "Private minimum" : "Your answer"}</span>
            <div>
              {isCompensation ? <span aria-hidden="true">$</span> : null}
              <input
                type={isCompensation ? "number" : isEmail ? "email" : isPhone ? "tel" : "text"}
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(event) => onChange(isCompensation ? (event.target.value ? Number(event.target.value) : null) : event.target.value)}
                placeholder={isCompensation ? "75,000" : question.key === "contact.address" ? "Street, city, state, postal code" : "Enter a confirmed answer"}
              />
              {isCompensation ? <em>per year</em> : null}
            </div>
          </label>
        ) : null}
      </div>

      {sensitive ? (
        <div className="sensitiveBoundary">
          <LockKeyhole size={17} aria-hidden="true" />
          <div>
            <strong>This answer is never inferred.</strong>
            <span>RoleAxis will follow the reuse rule shown here and pause if a future question falls outside it.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
