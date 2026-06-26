import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, FileText, PencilLine, Plus, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FactCategory, ProfileFact, ResumeRecord } from "../types";

const categoryLabels: Record<FactCategory, string> = {
  identity: "Identity",
  contact: "Contact",
  experience: "Experience",
  education: "Education",
  skill: "Skills",
  certification: "Credentials",
  link: "Links"
};

const categoryOrder = Object.keys(categoryLabels) as FactCategory[];

function fileSizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ProfileReview({
  onContinue,
  onReplace,
  onUpdateFacts,
  resume
}: {
  onContinue: () => void;
  onReplace: () => void;
  onUpdateFacts: (facts: ProfileFact[]) => void;
  resume: ResumeRecord;
}) {
  const [activeCategory, setActiveCategory] = useState<FactCategory>(() => resume.facts[0]?.category ?? "identity");
  const [newFact, setNewFact] = useState({ label: "", value: "" });
  const includedFacts = resume.facts.filter((fact) => fact.included);
  const verifiedFacts = includedFacts.filter((fact) => fact.verified);
  const currentFacts = resume.facts.filter((fact) => fact.category === activeCategory);
  const requiredIdentity = includedFacts.some((fact) => fact.category === "identity" && fact.verified);
  const requiredContact = includedFacts.some((fact) => fact.category === "contact" && fact.label === "Email" && fact.verified);
  const reviewComplete = includedFacts.length > 0 && verifiedFacts.length === includedFacts.length && requiredIdentity && requiredContact;

  const categories = useMemo(
    () => categoryOrder.filter((category) => resume.facts.some((fact) => fact.category === category) || category === activeCategory),
    [activeCategory, resume.facts]
  );

  function updateFact(id: string, update: Partial<ProfileFact>) {
    onUpdateFacts(resume.facts.map((fact) => (fact.id === id ? { ...fact, ...update } : fact)));
  }

  function addFact() {
    if (!newFact.label.trim() || !newFact.value.trim()) return;
    onUpdateFacts([
      ...resume.facts,
      {
        id: `${activeCategory}-${Date.now()}`,
        category: activeCategory,
        label: newFact.label.trim(),
        value: newFact.value.trim(),
        confidence: "review",
        included: true,
        verified: false
      }
    ]);
    setNewFact({ label: "", value: "" });
  }

  return (
    <div className="profileReview pageEntrance">
      <div className="workspaceHeading reviewHeading">
        <div>
          <button className="textButton back" type="button" onClick={onReplace}>
            <ArrowLeft size={15} aria-hidden="true" /> Replace resume
          </button>
          <span className="sectionKicker">Truth profile · review 01</span>
          <h1>Nothing becomes a claim until you say it is true.</h1>
          <p>Correct the extracted facts, exclude anything unreliable, then confirm each item RoleAxis may use.</p>
        </div>
        <div className="sourceReceipt" aria-label="Resume processing receipt">
          <FileText size={20} aria-hidden="true" />
          <div>
            <strong>{resume.fileName}</strong>
            <span>{resume.fileType} · {fileSizeLabel(resume.fileSize)}{resume.pageCount ? ` · ${resume.pageCount} pages` : ""}</span>
          </div>
          <span className="receiptStatus"><Check size={13} aria-hidden="true" /> Source discarded</span>
        </div>
      </div>

      <div className="reviewDeck">
        <aside className="profileOutline" aria-label="Profile fact categories">
          <span className="outlineLabel">Profile outline</span>
          {categories.map((category) => {
            const facts = resume.facts.filter((fact) => fact.category === category && fact.included);
            const complete = facts.length > 0 && facts.every((fact) => fact.verified);
            return (
              <button
                key={category}
                className={activeCategory === category ? "outlineItem selected" : "outlineItem"}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                <span>{complete ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}</span>
                <strong>{categoryLabels[category]}</strong>
                <em>{facts.filter((fact) => fact.verified).length}/{facts.length}</em>
              </button>
            );
          })}
          <div className="outlineNote">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Excluded facts remain outside the campaign.</span>
          </div>
        </aside>

        <section className="factWorkbench" aria-labelledby="fact-heading">
          <div className="workbenchHeader">
            <div>
              <span className="sectionKicker">{categoryLabels[activeCategory]}</span>
              <h2 id="fact-heading">Confirm what the resume supports.</h2>
            </div>
            <span className="completionFraction">{currentFacts.filter((fact) => fact.verified && fact.included).length} verified</span>
          </div>

          <div className="factList">
            {currentFacts.map((fact) => (
              <article key={fact.id} className={`factRow ${fact.verified ? "verified" : ""} ${!fact.included ? "excluded" : ""}`}>
                <div className="factState" aria-hidden="true">
                  {fact.verified ? <Check size={16} /> : <PencilLine size={16} />}
                </div>
                <label>
                  <span>{fact.label}</span>
                  <input
                    value={fact.value}
                    onChange={(event) => updateFact(fact.id, { value: event.target.value, verified: false })}
                    disabled={!fact.included}
                    aria-label={`${fact.label} value`}
                  />
                </label>
                <span className={`confidenceTag ${fact.confidence}`}>
                  {fact.confidence === "high" ? "Exact match" : fact.confidence === "medium" ? "Likely match" : "Needs review"}
                </span>
                <div className="factActions">
                  <button
                    className={fact.verified ? "iconTextButton confirmed" : "iconTextButton"}
                    type="button"
                    onClick={() => updateFact(fact.id, { included: true, verified: !fact.verified })}
                  >
                    <Check size={15} aria-hidden="true" /> {fact.verified ? "Confirmed" : "Confirm"}
                  </button>
                  <button
                    className="iconButton subtle"
                    type="button"
                    onClick={() => updateFact(fact.id, { included: !fact.included, verified: false })}
                    aria-label={fact.included ? `Exclude ${fact.label}` : `Restore ${fact.label}`}
                    title={fact.included ? "Exclude from profile" : "Restore to profile"}
                  >
                    {fact.included ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                  </button>
                </div>
              </article>
            ))}

            <div className="addFactRow">
              <Plus size={17} aria-hidden="true" />
              <input
                value={newFact.label}
                onChange={(event) => setNewFact((current) => ({ ...current, label: event.target.value }))}
                placeholder="Fact label"
                aria-label="New fact label"
              />
              <input
                value={newFact.value}
                onChange={(event) => setNewFact((current) => ({ ...current, value: event.target.value }))}
                placeholder="Verified value"
                aria-label="New fact value"
                onKeyDown={(event) => {
                  if (event.key === "Enter") addFact();
                }}
              />
              <button className="textButton" type="button" onClick={addFact} disabled={!newFact.label.trim() || !newFact.value.trim()}>Add fact</button>
            </div>
          </div>
        </section>

        <aside className="truthLedger">
          <span className="sectionKicker">Truth ledger</span>
          <div className="ledgerScore">
            <strong>{verifiedFacts.length}</strong>
            <span>of {includedFacts.length} facts verified</span>
          </div>
          <div className="ledgerBar"><span style={{ width: `${includedFacts.length ? (verifiedFacts.length / includedFacts.length) * 100 : 0}%` }} /></div>
          <dl>
            <div><dt>Identity confirmed</dt><dd>{requiredIdentity ? "Yes" : "Required"}</dd></div>
            <div><dt>Email confirmed</dt><dd>{requiredContact ? "Yes" : "Required"}</dd></div>
            <div><dt>Unsupported claims</dt><dd>0 allowed</dd></div>
          </dl>
          <p>RoleAxis may rephrase a confirmed fact later. It may never expand the meaning or invent supporting detail.</p>
          <button className="actionButton primary wide" type="button" onClick={onContinue} disabled={!reviewComplete}>
            Continue to preferences <ArrowRight size={17} aria-hidden="true" />
          </button>
          {!reviewComplete ? <span className="actionHint">Confirm all included facts, including a name and email, to continue.</span> : null}
        </aside>
      </div>
    </div>
  );
}
