import { ArrowRight, Bookmark, CheckCircle2, CircleAlert, ClipboardCheck, FileSearch, MapPin, ShieldCheck } from "lucide-react";
import type { AppView, CampaignDraft } from "../types";

export function ReviewWorkspace({
  campaign,
  onNavigate,
  updateCampaign
}: {
  campaign: CampaignDraft;
  onNavigate: (view: AppView) => void;
  updateCampaign: (update: (current: CampaignDraft) => CampaignDraft) => void;
}) {
  const queue = campaign.jobs.filter((job) => job.status === "review_queue").sort((left, right) => right.match.score - left.match.score);
  const openDossier = (jobId: string) => {
    updateCampaign((current) => ({ ...current, selectedJobId: jobId }));
    onNavigate("dossier");
  };
  const saveForLater = (jobId: string) => {
    const now = new Date().toISOString();
    updateCampaign((current) => ({ ...current, jobs: current.jobs.map((job) => job.jobId === jobId ? {
      ...job,
      status: "saved",
      outcome: "save_for_later",
      review: { decisionReason: "Removed from active review and saved for comparison.", decidedAt: now },
      metadata: { ...job.metadata, updatedAt: now }
    } : job) }));
  };

  return (
    <div className="reviewWorkspace pageEntrance">
      <div className="workspaceHeading reviewQueueHeading">
        <div><span className="sectionKicker">Review queue</span><h1>Decide with the whole record in view.</h1><p>Only roles you deliberately move here appear in this queue. Nothing is submitted, tailored, or sent from this surface.</p></div>
        <button className="actionButton secondary" type="button" onClick={() => onNavigate("search")}><FileSearch size={16} aria-hidden="true" /> Return to discovery</button>
      </div>

      <section className="reviewProtocol">
        <div><ShieldCheck size={20} aria-hidden="true" /><span><strong>Evidence gate</strong><small>Every score is decomposed into five visible dimensions.</small></span></div>
        <div><ClipboardCheck size={20} aria-hidden="true" /><span><strong>{queue.length} active decision{queue.length === 1 ? "" : "s"}</strong><small>Moved here by you from a job dossier.</small></span></div>
        <div><CheckCircle2 size={20} aria-hidden="true" /><span><strong>Submission unavailable</strong><small>Document and application runners are not connected.</small></span></div>
      </section>

      {queue.length ? (
        <section className="reviewQueue" aria-label="Roles awaiting review">
          <div className="reviewQueueHeader"><span>Role and source</span><span>Evidence</span><span>Open concerns</span><span>Decision</span></div>
          {queue.map((job) => (
            <article key={job.jobId} className="reviewQueueRow">
              <div className="reviewRole"><span className="queueSource">{job.source.name} · {job.fingerprint.toUpperCase()}</span><h2>{job.title}</h2><p>{job.company}</p><span className="queueLocation"><MapPin size={14} aria-hidden="true" />{job.location} · {job.remoteType}</span></div>
              <div className="queueScore"><strong>{job.match.score}</strong><span>of 100</span><div><span style={{ width: `${job.match.score}%` }} /></div></div>
              <div className="queueConcerns"><span><CircleAlert size={15} aria-hidden="true" />{job.match.concerns.length} concern{job.match.concerns.length === 1 ? "" : "s"}</span><p>{job.match.concerns[0] ?? "No unresolved concern detected."}</p></div>
              <div className="queueActions"><button className="actionButton primary" type="button" onClick={() => openDossier(job.jobId)}>Open dossier <ArrowRight size={15} aria-hidden="true" /></button><button className="textButton" type="button" onClick={() => saveForLater(job.jobId)}><Bookmark size={14} aria-hidden="true" /> Save for later</button></div>
            </article>
          ))}
        </section>
      ) : (
        <section className="emptyReviewQueue">
          <span><ClipboardCheck size={27} aria-hidden="true" /></span>
          <span className="sectionKicker">No active decisions</span>
          <h2>The review desk is clear.</h2>
          <p>Open an imported role’s dossier and move it here when the evidence deserves an application decision.</p>
          <button className="actionButton primary" type="button" onClick={() => onNavigate("search")}>Open discovery <ArrowRight size={16} aria-hidden="true" /></button>
        </section>
      )}
    </div>
  );
}
