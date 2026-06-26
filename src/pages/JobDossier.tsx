import { ArrowLeft, ArrowRight, Bookmark, BriefcaseBusiness, Check, CheckCircle2, CircleAlert, CircleDollarSign, Clock3, ExternalLink, Link2, MapPin, ShieldAlert, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useModalFocus } from "../hooks/useModalFocus";
import type { AppView, CampaignDraft, JobOutcome, JobRecord, JobStatus } from "../types";

const skipReasons = [
  "Outside target role",
  "Compensation does not fit",
  "Location or work arrangement",
  "Required qualification gap",
  "Company preference",
  "Posting quality or uncertainty",
  "Other"
];

function salaryLabel(job: JobRecord) {
  if (job.salary.minimum === null && job.salary.maximum === null) return "Not disclosed";
  const format = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `${job.salary.minimum !== null ? format(job.salary.minimum) : "—"}${job.salary.maximum !== null && job.salary.maximum !== job.salary.minimum ? ` – ${format(job.salary.maximum)}` : ""} / ${job.salary.period}`;
}

function recommendation(job: JobRecord) {
  if (job.status === "review_queue") return { label: "In review queue", detail: "The role is ready for a structured application decision." };
  if (job.status === "saved") return { label: "Saved for comparison", detail: "The record stays available without entering active review." };
  if (job.status === "skipped") return { label: "Skipped by you", detail: job.review.decisionReason ?? "The role is outside the active campaign." };
  if (job.outcome === "prepare_for_review") return { label: "Prepare for review", detail: "The evidence meets the current score threshold; concerns remain visible." };
  if (job.outcome === "ask_user") return { label: "Decision needed", detail: "The evidence is promising, but one or more campaign gates need your judgment." };
  return { label: "Hold for comparison", detail: "The current match does not justify active application preparation." };
}

export function JobDossier({
  campaign,
  onNavigate,
  updateCampaign
}: {
  campaign: CampaignDraft;
  onNavigate: (view: AppView) => void;
  updateCampaign: (update: (current: CampaignDraft) => CampaignDraft) => void;
}) {
  const job = campaign.jobs.find((item) => item.jobId === campaign.selectedJobId);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocus(showSkipDialog, () => setShowSkipDialog(false));

  if (!job) {
    return (
      <section className="missingDossier pageEntrance">
        <BriefcaseBusiness size={28} aria-hidden="true" />
        <span className="sectionKicker">Job dossier</span>
        <h1>No role is selected.</h1>
        <p>Choose an imported role from discovery or the review queue.</p>
        <button className="actionButton primary" type="button" onClick={() => onNavigate("search")}>Open discovery <ArrowRight size={16} aria-hidden="true" /></button>
      </section>
    );
  }

  const jobId = job.jobId;
  const recommended = recommendation(job);

  function recordDecision(status: JobStatus, outcome: JobOutcome, reason: string) {
    const now = new Date().toISOString();
    updateCampaign((current) => ({
      ...current,
      jobs: current.jobs.map((item) => item.jobId === jobId ? {
        ...item,
        status,
        outcome,
        review: { decisionReason: reason, decidedAt: now },
        metadata: { ...item.metadata, updatedAt: now }
      } : item)
    }));
  }

  function confirmSkip() {
    const reason = skipReason === "Other" ? customReason.trim() : skipReason;
    if (!reason) return;
    recordDecision("skipped", "skip", reason);
    setShowSkipDialog(false);
  }

  return (
    <div className="jobDossier pageEntrance">
      <button className="textButton back" type="button" onClick={() => onNavigate(job.status === "review_queue" ? "review" : "search")}><ArrowLeft size={15} aria-hidden="true" /> Back to {job.status === "review_queue" ? "review" : "discovery"}</button>

      <section className="dossierOpening">
        <div className="dossierIdentity">
          <div className="dossierSource"><ShieldCheck size={15} aria-hidden="true" /><span><strong>{job.source.name}</strong><small>Manual import · source retained</small></span></div>
          <span className="sectionKicker">Job dossier · {job.fingerprint.toUpperCase()}</span>
          <h1>{job.title}</h1>
          <p className="dossierCompany">{job.company}</p>
          <div className="dossierMeta"><span><MapPin size={16} aria-hidden="true" />{job.location} · {job.remoteType}</span><span><CircleDollarSign size={16} aria-hidden="true" />{salaryLabel(job)}</span><span><Clock3 size={16} aria-hidden="true" />Imported {new Date(job.metadata.discoveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
        </div>
        <div className="dossierScore">
          <div className="scoreOrbit" style={{ "--score": `${job.match.score * 3.6}deg` } as CSSProperties}><span><strong>{job.match.score}</strong><em>evidence score</em></span></div>
          <p>{job.match.summary}</p>
        </div>
      </section>

      <section className="dossierDecisionBar">
        <div><span className="sectionKicker">Recommended next state</span><strong>{recommended.label}</strong><p>{recommended.detail}</p></div>
        <div className="decisionActions">
          <button className="actionButton primary" type="button" onClick={() => recordDecision("review_queue", "prepare_for_review", "Moved to review after dossier assessment.")} disabled={job.status === "review_queue"}><SlidersHorizontal size={16} aria-hidden="true" />{job.status === "review_queue" ? "In review queue" : "Send to review"}</button>
          <button className="actionButton secondary" type="button" onClick={() => recordDecision("saved", "save_for_later", "Saved for comparison.")} disabled={job.status === "saved"}><Bookmark size={16} aria-hidden="true" />{job.status === "saved" ? "Saved" : "Save for later"}</button>
          <button className="textButton skipAction" type="button" onClick={() => setShowSkipDialog(true)}>Skip role</button>
        </div>
      </section>

      <div className="dossierGrid">
        <section className="matchEvidence" aria-labelledby="evidence-heading">
          <div className="sectionLead"><span className="sectionKicker">Match anatomy</span><h2 id="evidence-heading">Every point has a reason.</h2><p>This score is deterministic. It compares the posting with confirmed profile facts and campaign rules—never inferred qualifications.</p></div>
          <div className="breakdownList">
            {job.match.breakdown.map((dimension) => (
              <div key={dimension.key} className="breakdownRow">
                <div><strong>{dimension.label}</strong><span>{dimension.summary}</span></div>
                <div className="breakdownMeasure"><div><span style={{ width: `${(dimension.score / dimension.maximum) * 100}%` }} /></div><strong>{dimension.score}<em>/{dimension.maximum}</em></strong></div>
              </div>
            ))}
          </div>
        </section>

        <aside className="evidenceSummary">
          <section className="strengthPanel"><span className="evidenceIcon"><CheckCircle2 size={18} aria-hidden="true" /></span><span className="sectionKicker">Supported alignment</span><h2>{job.match.strengths.length || 0} evidence-backed strength{job.match.strengths.length === 1 ? "" : "s"}</h2>{job.match.strengths.length ? <ul>{job.match.strengths.map((item) => <li key={item}><Check size={14} aria-hidden="true" />{item}</li>)}</ul> : <p>No direct strength is being claimed yet.</p>}</section>
          <section className="concernPanel"><span className="evidenceIcon"><CircleAlert size={18} aria-hidden="true" /></span><span className="sectionKicker">Review before effort</span><h2>{job.match.concerns.length || 0} open concern{job.match.concerns.length === 1 ? "" : "s"}</h2>{job.match.concerns.length ? <ul>{job.match.concerns.map((item) => <li key={item}><ShieldAlert size={14} aria-hidden="true" />{item}</li>)}</ul> : <p>No unresolved concern was detected.</p>}</section>
        </aside>
      </div>

      <div className="postingEvidenceGrid">
        <section className="qualificationRecord">
          <div className="sectionLead"><span className="sectionKicker">Extracted qualification record</span><h2>What the posting explicitly asks for.</h2></div>
          <div className="qualificationColumns">
            <div><h3>Required</h3>{job.requirements.length ? <ol>{job.requirements.map((item) => <li key={item}>{item}</li>)}</ol> : <p>No distinct required-qualification section was detected.</p>}</div>
            <div><h3>Preferred</h3>{job.preferredQualifications.length ? <ol>{job.preferredQualifications.map((item) => <li key={item}>{item}</li>)}</ol> : <p>No distinct preferred-qualification section was detected.</p>}</div>
          </div>
        </section>

        <aside className="sourceReceiptPanel">
          <Link2 size={22} aria-hidden="true" />
          <span className="sectionKicker">Source receipt</span>
          <h2>{job.source.name}</h2>
          <dl><div><dt>Portal classification</dt><dd>{job.source.portalType.replaceAll("_", " ")}</dd></div><div><dt>External ID</dt><dd>{job.source.externalId || "Not detected"}</dd></div><div><dt>Import method</dt><dd>Manual evidence</dd></div><div><dt>Tracking parameters</dt><dd>Removed</dd></div></dl>
          <a className="sourceLink" href={job.source.url} target="_blank" rel="noreferrer">Open original posting <ExternalLink size={14} aria-hidden="true" /></a>
        </aside>
      </div>

      <section className="originalPosting" aria-labelledby="posting-heading">
        <div><span className="sectionKicker">Original evidence</span><h2 id="posting-heading">Posting text used for this score.</h2><p>Stored as plain text inside the encrypted campaign draft. No scripts or formatting from the source are executed.</p></div>
        <pre>{job.description}</pre>
      </section>

      {showSkipDialog ? (
        <div className="dialogBackdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowSkipDialog(false); }}>
          <section ref={dialogRef} className="confirmationDialog skipDialog" role="dialog" aria-modal="true" aria-labelledby="skip-title" onKeyDown={handleKeyDown}>
            <button ref={initialFocusRef} className="dialogClose" type="button" onClick={() => setShowSkipDialog(false)} aria-label="Close"><X size={18} /></button>
            <span className="dialogIcon"><ShieldAlert size={22} aria-hidden="true" /></span>
            <span className="sectionKicker">Campaign learning</span>
            <h2 id="skip-title">Why are you skipping this role?</h2>
            <p>The reason stays with the campaign record and can improve later discovery decisions. It is not sent anywhere.</p>
            <div className="skipReasons">{skipReasons.map((reason) => <button key={reason} className={skipReason === reason ? "selected" : ""} type="button" onClick={() => setSkipReason(reason)}><span>{skipReason === reason ? <Check size={14} aria-hidden="true" /> : null}</span>{reason}</button>)}</div>
            {skipReason === "Other" ? <label className="customSkipReason"><span>Reason</span><input value={customReason} onChange={(event) => setCustomReason(event.target.value)} placeholder="Add a concise campaign note" /></label> : null}
            <div className="dialogActions"><button className="actionButton secondary" type="button" onClick={() => setShowSkipDialog(false)}>Keep role</button><button className="dangerButton solid" type="button" onClick={confirmSkip} disabled={!skipReason || (skipReason === "Other" && !customReason.trim())}>Skip and record reason</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
