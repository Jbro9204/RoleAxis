import { Activity, AlertTriangle, ArrowRight, Building2, Check, CircleDollarSign, Compass, FileInput, Filter, History, Link2, LoaderCircle, MapPin, Plus, Radar, RefreshCw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useModalFocus } from "../hooks/useModalFocus";
import { createJobRecord, findDuplicateJob, JobImportError } from "../services/jobDiscovery";
import { createRunningSearchRun, createSourceConnection, disconnectSourceConnection, failSourceRun, fetchSourceFeed, reconcileSourceFeed, SourceDiscoveryError } from "../services/sourceDiscovery";
import type { AppView, CampaignDraft, JobImportInput, JobRecord, JobStatus, SourceConnection } from "../types";

const emptyImport: JobImportInput = {
  url: "",
  company: "",
  title: "",
  location: "",
  remoteType: "unknown",
  salaryMinimum: null,
  salaryMaximum: null,
  salaryCurrency: "USD",
  salaryPeriod: "year",
  description: ""
};

const filters: Array<{ value: "active" | JobStatus; label: string }> = [
  { value: "active", label: "Active signal" },
  { value: "review_queue", label: "In review" },
  { value: "saved", label: "Saved" },
  { value: "skipped", label: "Skipped" },
  { value: "closed", label: "Closed" }
];

function formatRelativeTime(value: string | null) {
  if (!value) return "Not run yet";
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function answerList(campaign: CampaignDraft, key: string) {
  const value = campaign.answers[key]?.value;
  return Array.isArray(value) ? value.map(String) : [];
}

function salaryLabel(job: JobRecord) {
  const { minimum, maximum, period } = job.salary;
  if (minimum === null && maximum === null) return "Compensation not listed";
  const format = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: job.salary.currency, maximumFractionDigits: 0 }).format(value);
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
  const [showConnect, setShowConnect] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [runningSourceIds, setRunningSourceIds] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState(false);
  const [disconnectingSourceId, setDisconnectingSourceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("active");
  const [query, setQuery] = useState("");
  const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocus(showImport, () => setShowImport(false));
  const connectModal = useModalFocus(showConnect, () => { if (!connecting) setShowConnect(false); });
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

  async function runSource(connection: SourceConnection) {
    if (runningSourceIds.has(connection.sourceId)) return;
    const running = createRunningSearchRun(connection);
    setRunningSourceIds((current) => new Set(current).add(connection.sourceId));
    setSourceError(null);
    setSuccessMessage(null);
    updateCampaign((current) => ({ ...current, searchRuns: [running, ...current.searchRuns.filter((run) => run.runId !== running.runId)].slice(0, 50) }));
    try {
      const feed = await fetchSourceFeed(connection.boardUrl);
      updateCampaign((current) => reconcileSourceFeed(current, connection, running, feed));
      const detail = feed.jobs.length
        ? `${feed.jobs.length} published role${feed.jobs.length === 1 ? "" : "s"} checked with source receipts retained.`
        : "The board is reachable and currently has no published roles.";
      setSuccessMessage(`${connection.organizationName}: ${detail}`);
    } catch (error) {
      const message = error instanceof SourceDiscoveryError ? error.message : "The public board could not be checked safely.";
      updateCampaign((current) => failSourceRun(current, connection, running, message));
      setSourceError(`${connection.organizationName}: ${message}`);
    } finally {
      setRunningSourceIds((current) => {
        const next = new Set(current);
        next.delete(connection.sourceId);
        return next;
      });
    }
  }

  async function runAllSources() {
    for (const connection of campaign.sources) await runSource(connection);
  }

  async function connectSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const organizationName = sourceName.trim();
    const boardUrl = sourceUrl.trim();
    if (!organizationName || !boardUrl) {
      setSourceError("Enter the employer name and its complete public careers URL.");
      return;
    }
    setConnecting(true);
    setSourceError(null);
    setSuccessMessage(null);
    try {
      const feed = await fetchSourceFeed(boardUrl);
      if (campaign.sources.some((source) => source.boardUrl.toLowerCase() === feed.source.boardUrl.toLowerCase())) {
        throw new SourceDiscoveryError("That public board is already connected to this campaign.", "duplicate_source");
      }
      const connection = createSourceConnection(organizationName, feed);
      const running = createRunningSearchRun(connection, feed.fetchedAt);
      updateCampaign((current) => reconcileSourceFeed({
        ...current,
        sources: [connection, ...current.sources],
        searchRuns: [running, ...current.searchRuns]
      }, connection, running, feed));
      setSourceName("");
      setSourceUrl("");
      setShowConnect(false);
      setSuccessMessage(`${organizationName} is connected. ${feed.jobs.length} published role${feed.jobs.length === 1 ? " was" : "s were"} checked immediately.`);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "The public board could not be connected safely.");
    } finally {
      setConnecting(false);
    }
  }

  function disconnectSource(sourceId: string) {
    updateCampaign((current) => disconnectSourceConnection(current, sourceId));
    setDisconnectingSourceId(null);
    setSuccessMessage("The live connection was removed. Existing dossiers and source receipts remain in the private campaign record.");
  }

  return (
    <div className="discoveryWorkspace pageEntrance">
      <div className="workspaceHeading discoveryHeading">
        <div>
          <span className="sectionKicker">Discovery console</span>
          <h1>Build signal you can defend.</h1>
          <p>Connect verified public career boards or bring a posting yourself. Every role is normalized, reconciled across sources, scored against confirmed evidence, and kept with a source receipt.</p>
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
      {sourceError && !showConnect ? <div className="inlineMessage error sourceRunMessage" role="alert"><AlertTriangle size={16} aria-hidden="true" /><span>{sourceError}</span></div> : null}

      <section className="sourceNetwork" aria-labelledby="source-network-heading">
        <div className="sourceNetworkLead">
          <div>
            <span className="sectionKicker">Source rail</span>
            <h2 id="source-network-heading">Live discovery, with receipts.</h2>
            <p>RoleAxis reads public postings only. It never signs in, submits, or sends profile data to a source.</p>
          </div>
          <div className="sourceNetworkActions">
            <button className="actionButton secondary" type="button" onClick={() => { setSourceError(null); setShowConnect(true); }}><Link2 size={16} aria-hidden="true" /> Connect public board</button>
            <button className="actionButton primary" type="button" onClick={runAllSources} disabled={!campaign.sources.length || runningSourceIds.size > 0}>
              {runningSourceIds.size ? <LoaderCircle className="spinning" size={16} aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
              {runningSourceIds.size ? `Checking ${runningSourceIds.size}` : "Run all sources"}
            </button>
          </div>
        </div>

        {campaign.sources.length ? (
          <div className="sourceCards">
            {campaign.sources.map((source) => {
              const isRunning = runningSourceIds.has(source.sourceId);
              const sourceJobs = campaign.jobs.filter((job) => job.sources.some((receipt) => receipt.sourceId === source.sourceId && receipt.active)).length;
              return (
                <article key={source.sourceId} className={`sourceCard ${source.status}`}>
                  <div className="sourceCardMark"><Building2 size={19} aria-hidden="true" /></div>
                  <div className="sourceCardIdentity">
                    <span><i />{source.status === "attention" ? "Needs attention" : "Verified public feed"}</span>
                    <h3>{source.organizationName}</h3>
                    <p>Public careers board · {sourceJobs} active role{sourceJobs === 1 ? "" : "s"}</p>
                  </div>
                  <div className="sourceCardTime"><span>Last checked</span><strong>{formatRelativeTime(source.lastCheckedAt)}</strong></div>
                  <div className="sourceCardActions">
                    {disconnectingSourceId === source.sourceId ? (
                      <div className="disconnectConfirm"><span>Keep dossiers?</span><button type="button" onClick={() => setDisconnectingSourceId(null)}>Keep source</button><button type="button" onClick={() => disconnectSource(source.sourceId)}>Disconnect</button></div>
                    ) : (
                      <>
                        <button className="iconAction" type="button" onClick={() => setDisconnectingSourceId(source.sourceId)} aria-label={`Disconnect ${source.organizationName}`}><Trash2 size={15} aria-hidden="true" /></button>
                        <button className="textButton" type="button" onClick={() => runSource(source)} disabled={isRunning}>{isRunning ? <LoaderCircle className="spinning" size={14} aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}{isRunning ? "Checking" : "Run now"}</button>
                      </>
                    )}
                  </div>
                  {source.lastError ? <p className="sourceCardError"><AlertTriangle size={13} aria-hidden="true" />{source.lastError}</p> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="sourceNetworkEmpty">
            <span><Radar size={21} aria-hidden="true" /></span>
            <div><strong>No live source is connected.</strong><p>Connect an employer’s supported public careers page, or keep using precise manual import.</p></div>
            <button className="textButton" type="button" onClick={() => setShowConnect(true)}>Connect the first board <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
        )}

        {campaign.searchRuns.length ? (
          <div className="runLedger">
            <div className="runLedgerTitle"><History size={15} aria-hidden="true" /><span>Recent source checks</span></div>
            <div className="runLedgerEntries">
              {campaign.searchRuns.slice(0, 4).map((run) => (
                <div key={run.runId} className={`runEntry ${run.status}`}>
                  <span className="runStatus">{run.status === "running" ? <LoaderCircle className="spinning" size={13} aria-hidden="true" /> : run.status === "failed" ? <AlertTriangle size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}{run.status}</span>
                  <strong>{run.sourceName}</strong>
                  <span>{run.status === "running" ? "Checking published roles…" : `${run.fetchedCount} checked · ${run.newCount} new · ${run.duplicateCount} reconciled · ${run.closedCount} closed`}</span>
                  <time dateTime={run.completedAt ?? run.startedAt}>{formatRelativeTime(run.completedAt ?? run.startedAt)}</time>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

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
                    <span className="sourceLine"><ShieldCheck size={13} aria-hidden="true" /> {job.source.name} · {job.source.importMethod === "public_feed" ? "verified public feed" : "manually supplied evidence"}</span>
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
          <span className="sectionKicker">Integrity boundary</span>
          <div className="sourceBoundaryIcon"><ShieldCheck size={22} aria-hidden="true" /></div>
          <h2>Read public signal. Protect private truth.</h2>
          <p>Source checks send only a public board address to the local gateway. Resume facts, campaign answers, scores, and decisions never leave this workspace.</p>
          <dl>
            <div><dt>Live connections</dt><dd>{campaign.sources.length}</dd></div>
            <div><dt>Completed checks</dt><dd>{campaign.searchRuns.filter((run) => run.status !== "running").length}</dd></div>
            <div><dt>Reconciliation</dt><dd>Cross-source</dd></div>
            <div><dt>Private data shared</dt><dd>None</dd></div>
          </dl>
          <button className="actionButton secondary wide" type="button" onClick={() => setShowImport(true)}><Plus size={16} aria-hidden="true" /> Add another role</button>
        </aside>
      </div>

      {showConnect ? (
        <div className="dialogBackdrop" role="presentation" onMouseDown={(event) => { if (!connecting && event.currentTarget === event.target) setShowConnect(false); }}>
          <section ref={connectModal.dialogRef} className="confirmationDialog sourceConnectDialog" role="dialog" aria-modal="true" aria-labelledby="connect-source-title" onKeyDown={connectModal.handleKeyDown}>
            <button ref={connectModal.initialFocusRef} className="dialogClose" type="button" onClick={() => setShowConnect(false)} aria-label="Close source connection" disabled={connecting}><X size={18} /></button>
            <span className="dialogIcon sourceConnectIcon"><Activity size={22} aria-hidden="true" /></span>
            <span className="sectionKicker">Verified public source</span>
            <h2 id="connect-source-title">Connect the employer’s careers page.</h2>
            <p>Paste the public board address—not an individual applicant link. RoleAxis will verify the feed, check it immediately, and retain a receipt for every role.</p>
            <form className="sourceConnectForm" onSubmit={connectSource} noValidate>
              {sourceError ? <div className="inlineMessage error" role="alert"><strong>Connection paused.</strong><span>{sourceError}</span></div> : null}
              <label><span>Employer name</span><input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Exact public company name" autoComplete="organization" disabled={connecting} /></label>
              <label><span>Public careers URL</span><div className="inputWithIcon"><Link2 size={15} aria-hidden="true" /><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://public-careers-board.example/company" disabled={connecting} /></div><small>Supported public board URLs are recognized automatically. Unsupported sources remain available through manual import.</small></label>
              <div className="sourcePrivacyNote"><ShieldCheck size={16} aria-hidden="true" /><span>Only this public URL is checked. No resume, profile fact, or private campaign rule is transmitted.</span></div>
              <div className="dialogActions"><button className="actionButton secondary" type="button" onClick={() => setShowConnect(false)} disabled={connecting}>Cancel</button><button className="actionButton primary" type="submit" disabled={connecting}>{connecting ? <LoaderCircle className="spinning" size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}{connecting ? "Verifying source" : "Connect and check now"}</button></div>
            </form>
          </section>
        </div>
      ) : null}

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
