import { ArrowRight, Check, CircleDollarSign, Compass, FileInput, Filter, Link2, MapPin, Plus, Radar, Search, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useModalFocus } from "../hooks/useModalFocus";
import { createJobRecord, findDuplicateJob, JobImportError } from "../services/jobDiscovery";
import type { AppView, CampaignDraft, JobImportInput, JobRecord, JobStatus } from "../types";

const emptyImport: JobImportInput = {
  url: "",
  company: "",
  title: "",
  location: "",
  remoteType: "unknown",
  salaryMinimum: null,
  salaryMaximum: null,
  salaryPeriod: "year",
  description: ""
};

const filters: Array<{ value: "active" | JobStatus; label: string }> = [
  { value: "active", label: "Active signal" },
  { value: "review_queue", label: "In review" },
  { value: "saved", label: "Saved" },
  { value: "skipped", label: "Skipped" }
];

function answerList(campaign: CampaignDraft, key: string) {
  const value = campaign.answers[key]?.value;
  return Array.isArray(value) ? value.map(String) : [];
}

function salaryLabel(job: JobRecord) {
  const { minimum, maximum, period } = job.salary;
  if (minimum === null && maximum === null) return "Compensation not listed";
  const format = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `${minimum !== null ? format(minimum) : "—"}${maximum !== null && maximum !== minimum ? `–${format(maximum)}` : ""} / ${period}`;
}

function outcomeLabel(job: JobRecord) {
  if (job.status === "review_queue") return "Queued for review";
  if (job.status === "saved") return "Saved for later";
  if (job.status === "skipped") return "Skipped by you";
  if (job.outcome === "prepare_for_review") return "Ready for review";
  if (job.outcome === "ask_user") return "Needs a decision";
  return "Hold for comparison";
}

export function DiscoveryWorkspace({
  campaign,
  onNavigate,
  updateCampaign
}: {
  campaign: CampaignDraft;
  onNavigate: (view: AppView) => void;
  updateCampaign: (update: (current: CampaignDraft) => CampaignDraft) => void;
}) {
  const [showImport, setShowImport] = useState(false);
  const [importDraft, setImportDraft] = useState<JobImportInput>(emptyImport);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof JobImportInput, string>>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("active");
  const [query, setQuery] = useState("");
  const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocus(showImport, () => setShowImport(false));
  const targetTitles = answerList(campaign, "search.target_titles");
  const locations = answerList(campaign, "search.locations");
  const remotePreference = String(campaign.answers["search.remote_preference"]?.value ?? "any");
  const compensation = campaign.answers["search.minimum_compensation"]?.value;

  const visibleJobs = useMemo(() => campaign.jobs
    .filter((job) => filter === "active" ? ["found", "review_queue", "saved"].includes(job.status) : job.status === filter)
    .filter((job) => !query.trim() || `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((left, right) => right.match.score - left.match.score), [campaign.jobs, filter, query]);

  function setField<K extends keyof JobImportInput>(key: K, value: JobImportInput[K]) {
    setImportDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setImportError(null);
  }

  function openDossier(jobId: string) {
    updateCampaign((current) => ({ ...current, selectedJobId: jobId }));
    onNavigate("dossier");
  }

  function importJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportError(null);
    setSuccessMessage(null);
    try {
      const candidate = createJobRecord(importDraft, campaign);
      const duplicate = findDuplicateJob(campaign.jobs, candidate);
      if (duplicate) {
        setImportError(`This role is already in the campaign as ${duplicate.company} · ${duplicate.title}.`);
        updateCampaign((current) => ({ ...current, selectedJobId: duplicate.jobId }));
        return;
      }
      updateCampaign((current) => ({ ...current, jobs: [...current.jobs, candidate], selectedJobId: candidate.jobId }));
      setImportDraft(emptyImport);
      setFieldErrors({});
      setShowImport(false);
      setSuccessMessage(`${candidate.company} · ${candidate.title} was normalized and scored from the evidence you supplied.`);
    } catch (error) {
      if (error instanceof JobImportError) {
        setFieldErrors(error.fieldErrors);
        setImportError(error.message);
      } else {
        setImportError(error instanceof Error ? error.message : "The posting could not be imported safely.");
      }
    }
  }

  return (
    <div className="discoveryWorkspace pageEntrance">
      <div className="workspaceHeading discoveryHeading">
        <div>
          <span className="sectionKicker">Discovery console</span>
          <h1>Turn a posting into accountable signal.</h1>
          <p>Import a role exactly as published. RoleAxis normalizes the source, checks duplicates, scores only against verified campaign evidence, and explains every point.</p>
        </div>
        <button className="actionButton primary" type="button" onClick={() => setShowImport(true)}>
          <Plus size={17} aria-hidden="true" /> Import a role
        </button>
      </div>

      <section className="searchCharter" aria-label="Active search charter">
        <div className="charterLead"><Compass size={20} aria-hidden="true" /><span><strong>Active search charter</strong><small>These rules shape every score.</small></span></div>
        <div><span>Target roles</span><strong>{targetTitles.join(" · ") || "Not configured"}</strong></div>
        <div><span>Locations</span><strong>{locations.join(" · ") || "Any configured location"}</strong></div>
        <div><span>Format</span><strong>{remotePreference}</strong></div>
        <div><span>Private floor</span><strong>{typeof compensation === "number" ? `$${compensation.toLocaleString("en-US")}` : "Not set"}</strong></div>
      </section>

      {successMessage ? <div className="inlineMessage success" role="status"><Check size={16} aria-hidden="true" /><span>{successMessage}</span></div> : null}

      <div className="discoveryDeck">
        <section className="signalDesk" aria-labelledby="signal-heading">
          <div className="signalToolbar">
            <div><span className="sectionKicker">Signal desk</span><h2 id="signal-heading">{campaign.jobs.length ? `${campaign.jobs.length} role${campaign.jobs.length === 1 ? "" : "s"} in this campaign` : "No roles imported yet"}</h2></div>
            <label className="jobSearch"><Search size={16} aria-hidden="true" /><span className="visuallyHidden">Search imported roles</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles" /></label>
          </div>
          <div className="signalFilters" aria-label="Filter imported roles">
            <Filter size={15} aria-hidden="true" />
            {filters.map((item) => <button key={item.value} type="button" className={filter === item.value ? "selected" : ""} onClick={() => setFilter(item.value)}>{item.label}<span>{item.value === "active" ? campaign.jobs.filter((job) => ["found", "review_queue", "saved"].includes(job.status)).length : campaign.jobs.filter((job) => job.status === item.value).length}</span></button>)}
          </div>

          {visibleJobs.length ? (
            <div className="jobSignalList">
              {visibleJobs.map((job) => (
                <article key={job.jobId} className="jobSignalRow">
                  <div className={`scoreMedallion score-${Math.floor(job.match.score / 10)}`}><strong>{job.match.score}</strong><span>match</span></div>
                  <div className="jobSignalMain">
                    <span className="sourceLine"><ShieldCheck size={13} aria-hidden="true" /> {job.source.name} · manually supplied source</span>
                    <h3>{job.title}</h3>
                    <p>{job.company}</p>
                    <div className="jobMeta"><span><MapPin size={14} aria-hidden="true" />{job.location} · {job.remoteType}</span><span><CircleDollarSign size={14} aria-hidden="true" />{salaryLabel(job)}</span></div>
                  </div>
                  <div className="jobSignalDecision"><span className={`outcomeTag ${job.outcome}`}>{outcomeLabel(job)}</span><p>{job.match.summary}</p><button className="textButton" type="button" onClick={() => openDossier(job.jobId)}>Open dossier <ArrowRight size={14} aria-hidden="true" /></button></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptySignal">
              <span><Radar size={25} aria-hidden="true" /></span>
              <h3>{campaign.jobs.length ? "No roles match this view." : "The signal desk is intentionally empty."}</h3>
              <p>{campaign.jobs.length ? "Change the filter or search text to see other campaign records." : "Import the first complete posting. No role enters this campaign through fabricated sample data."}</p>
              {!campaign.jobs.length ? <button className="actionButton secondary" type="button" onClick={() => setShowImport(true)}><FileInput size={16} aria-hidden="true" /> Import first role</button> : null}
            </div>
          )}
        </section>

        <aside className="sourceBoundary">
          <span className="sectionKicker">Source boundary</span>
          <div className="sourceBoundaryIcon"><Link2 size={22} aria-hidden="true" /></div>
          <h2>Evidence comes in. Nothing goes out.</h2>
          <p>The current adapter records a posting you provide. It does not sign in, scrape a board, contact an employer, or submit an application.</p>
          <dl>
            <div><dt>Supported source</dt><dd>Manual import</dd></div>
            <div><dt>URL handling</dt><dd>Tracking removed</dd></div>
            <div><dt>Duplicates</dt><dd>URL + role identity</dd></div>
            <div><dt>Scoring</dt><dd>Deterministic evidence</dd></div>
          </dl>
          <button className="actionButton secondary wide" type="button" onClick={() => setShowImport(true)}><Plus size={16} aria-hidden="true" /> Add another role</button>
        </aside>
      </div>

      {showImport ? (
        <div className="importOverlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowImport(false); }}>
          <section ref={dialogRef} className="importDrawer" role="dialog" aria-modal="true" aria-labelledby="import-title" onKeyDown={handleKeyDown}>
            <div className="importHeader"><div><span className="sectionKicker">Manual source adapter</span><h2 id="import-title">Import the posting as published.</h2><p>The URL is recorded for provenance; the page is not fetched. Paste the complete description below.</p></div><button ref={initialFocusRef} className="dialogClose" type="button" onClick={() => setShowImport(false)} aria-label="Close import form"><X size={18} /></button></div>
            <form className="jobImportForm" onSubmit={importJob} noValidate>
              {importError ? <div className="inlineMessage error formMessage" role="alert"><strong>Import paused.</strong><span>{importError}</span>{campaign.selectedJobId && importError.includes("already") ? <button className="textButton" type="button" onClick={() => onNavigate("dossier")}>Open existing dossier</button> : null}</div> : null}
              <label className={fieldErrors.url ? "fieldError" : ""}><span>Original job URL</span><div className="inputWithIcon"><Link2 size={15} aria-hidden="true" /><input type="url" value={importDraft.url} onChange={(event) => setField("url", event.target.value)} placeholder="https://company.example/jobs/role" /></div>{fieldErrors.url ? <em>{fieldErrors.url}</em> : null}</label>
              <div className="formPair">
                <label className={fieldErrors.company ? "fieldError" : ""}><span>Company</span><input value={importDraft.company} onChange={(event) => setField("company", event.target.value)} placeholder="Exact company name" />{fieldErrors.company ? <em>{fieldErrors.company}</em> : null}</label>
                <label className={fieldErrors.title ? "fieldError" : ""}><span>Role title</span><input value={importDraft.title} onChange={(event) => setField("title", event.target.value)} placeholder="Exact published title" />{fieldErrors.title ? <em>{fieldErrors.title}</em> : null}</label>
              </div>
              <div className="formPair locationPair">
                <label className={fieldErrors.location ? "fieldError" : ""}><span>Listed location</span><input value={importDraft.location} onChange={(event) => setField("location", event.target.value)} placeholder="City, state or Remote" />{fieldErrors.location ? <em>{fieldErrors.location}</em> : null}</label>
                <label><span>Work arrangement</span><select value={importDraft.remoteType} onChange={(event) => setField("remoteType", event.target.value as JobImportInput["remoteType"])}><option value="unknown">Not explicit</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option></select></label>
              </div>
              <fieldset className="salaryFields"><legend>Published compensation <span>Optional—RoleAxis can also detect a clear range in the description.</span></legend><label><span>Minimum</span><div className="currencyInput"><span>$</span><input type="number" min="0" value={importDraft.salaryMinimum ?? ""} onChange={(event) => setField("salaryMinimum", event.target.value ? Number(event.target.value) : null)} /></div>{fieldErrors.salaryMinimum ? <em>{fieldErrors.salaryMinimum}</em> : null}</label><label><span>Maximum</span><div className="currencyInput"><span>$</span><input type="number" min="0" value={importDraft.salaryMaximum ?? ""} onChange={(event) => setField("salaryMaximum", event.target.value ? Number(event.target.value) : null)} /></div>{fieldErrors.salaryMaximum ? <em>{fieldErrors.salaryMaximum}</em> : null}</label><label><span>Period</span><select value={importDraft.salaryPeriod} onChange={(event) => setField("salaryPeriod", event.target.value as JobImportInput["salaryPeriod"])}><option value="year">Per year</option><option value="hour">Per hour</option><option value="month">Per month</option><option value="week">Per week</option><option value="unknown">Unknown</option></select></label></fieldset>
              <label className={`descriptionField ${fieldErrors.description ? "fieldError" : ""}`}><span>Complete job description</span><textarea value={importDraft.description} onChange={(event) => setField("description", event.target.value)} rows={13} placeholder="Paste the responsibilities, required qualifications, preferred qualifications, compensation, and location language exactly as published." /><small>{importDraft.description.trim().length.toLocaleString("en-US")} characters</small>{fieldErrors.description ? <em>{fieldErrors.description}</em> : null}</label>
              <div className="importActions"><div><ShieldCheck size={16} aria-hidden="true" /><span>Nothing is submitted or sent to the source.</span></div><button className="actionButton primary" type="submit">Normalize and score <ArrowRight size={16} aria-hidden="true" /></button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
