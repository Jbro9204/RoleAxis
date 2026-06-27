import { ArrowRight, Check, Circle, ClipboardCheck, Compass, FileSearch, LockKeyhole, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { intakeSections } from "../data";
import type { AppView, CampaignDraft } from "../types";

function nextAction(campaign: CampaignDraft) {
  if (!campaign.resume) return { title: "Create your truth profile", detail: "Start with a resume. The original file stays in this browser and is discarded after extraction.", action: "Add resume", view: "launch" as AppView };
  if (campaign.status === "profile_review") return { title: "Confirm the extracted facts", detail: "Every included fact needs your approval before it can shape a search or application.", action: "Review profile", view: "launch" as AppView };
  if (campaign.status === "intake_in_progress") return { title: "Finish campaign calibration", detail: "Complete your search targets, eligibility, sensitive-answer rules, and submission boundary.", action: "Continue setup", view: "intake" as AppView };
  const reviewCount = campaign.jobs.filter((job) => job.status === "review_queue").length;
  if (reviewCount) return { title: `Review ${reviewCount} active candidate${reviewCount === 1 ? "" : "s"}`, detail: "Each dossier is ready for an evidence-led decision. No application action is connected yet.", action: "Open review queue", view: "review" as AppView };
  if (campaign.jobs.length) return { title: "Compare the current role signal", detail: "Imported roles are normalized, deduplicated, and scored. Open discovery to inspect or add another source.", action: "Open discovery", view: "search" as AppView };
  if (campaign.sources.length) return { title: "Run the connected source rail", detail: "Your public sources are ready. Run discovery to collect current postings with a receipt for every role.", action: "Run discovery", view: "search" as AppView };
  return { title: "Import the first verified posting", detail: "Your campaign rules are ready. Add a complete role posting to normalize, deduplicate, and score against confirmed evidence.", action: "Open discovery", view: "search" as AppView };
}

export function CommandCenter({ campaign, onNavigate }: { campaign: CampaignDraft; onNavigate: (view: AppView) => void }) {
  const action = nextAction(campaign);
  const allQuestions = intakeSections.flatMap((section) => section.questions);
  const configuredAnswers = allQuestions.filter((question) => campaign.answers[question.key]?.approved).length;
  const includedFacts = campaign.resume?.facts.filter((fact) => fact.included) ?? [];
  const verifiedFacts = includedFacts.filter((fact) => fact.verified);
  const ready = campaign.status === "ready";
  const reviewCount = campaign.jobs.filter((job) => job.status === "review_queue").length;
  const latestJob = [...campaign.jobs].sort((left, right) => right.metadata.discoveredAt.localeCompare(left.metadata.discoveredAt))[0];
  const latestRun = campaign.searchRuns.find((run) => run.status !== "running");

  const stages = [
    { label: "Truth profile", detail: campaign.resume ? `${verifiedFacts.length}/${includedFacts.length} facts verified` : "Resume required", complete: includedFacts.length > 0 && verifiedFacts.length === includedFacts.length, icon: ShieldCheck },
    { label: "Campaign rules", detail: `${configuredAnswers}/${allQuestions.length} answers configured`, complete: configuredAnswers === allQuestions.length, icon: Compass },
    { label: "Discovery", detail: campaign.jobs.length ? `${campaign.jobs.length} role${campaign.jobs.length === 1 ? "" : "s"} normalized` : campaign.sources.length ? `${campaign.sources.length} live source${campaign.sources.length === 1 ? "" : "s"} connected` : ready ? "Ready for a verified source" : "Waiting on setup", complete: campaign.jobs.length > 0 || campaign.sources.length > 0, icon: Radar },
    { label: "Review", detail: reviewCount ? `${reviewCount} active decision${reviewCount === 1 ? "" : "s"}` : "No candidates queued", complete: reviewCount > 0, icon: ClipboardCheck },
    { label: "Outcomes", detail: "No application activity", complete: false, icon: Sparkles }
  ];

  return (
    <div className="commandCenter pageEntrance">
      <section className="commandOpening">
        <div className="commandIntro">
          <span className="sectionKicker">Campaign command</span>
          <h1>{ready ? "Your campaign is calibrated." : "Build the foundation once. Move with clarity after."}</h1>
          <p>{ready ? "The truth profile and operating boundaries are in place. Public source checks and manual evidence now enter one explainable campaign record." : "RoleAxis is keeping later stages closed until the information needed to act safely is complete."}</p>
        </div>
        <div className="modeSeal">
          <span>Operating mode</span>
          <strong>{campaign.automationMode.replaceAll("_", " ")}</strong>
          <em>{campaign.automationMode === "approval_required" ? "Every final submission returns to you." : "The configured rule set controls every action."}</em>
          <button type="button" className="textButton" onClick={() => onNavigate("rules")}>Inspect boundaries <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
      </section>

      <section className="operatingAxis" aria-labelledby="axis-heading">
        <div className="axisHeader">
          <div><span className="sectionKicker">Operating axis</span><h2 id="axis-heading">One campaign. Five accountable stages.</h2></div>
          <span className={`readinessFlag ${ready ? "ready" : "building"}`}>{ready ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}{ready ? "Setup complete" : "Setup in progress"}</span>
        </div>
        <div className="axisTrack">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} className={`axisStage ${stage.complete ? "complete" : ""}`}>
                <div className="axisNode"><Icon size={19} aria-hidden="true" /></div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{stage.label}</strong>
                <p>{stage.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="commandLowerDeck">
        <section className="nextActionDesk">
          <div className="deskMarker"><Compass size={21} aria-hidden="true" /></div>
          <div>
            <span className="sectionKicker">Next deliberate move</span>
            <h2>{action.title}</h2>
            <p>{action.detail}</p>
          </div>
          <button className="actionButton primary" type="button" onClick={() => onNavigate(action.view)}>{action.action}<ArrowRight size={16} aria-hidden="true" /></button>
        </section>

        <section className="activityLedger" aria-labelledby="activity-heading">
          <div className="ledgerHeading"><div><span className="sectionKicker">Today’s record</span><h2 id="activity-heading">{latestJob ? "Evidence entered the campaign." : "Quiet by design."}</h2></div><FileSearch size={22} aria-hidden="true" /></div>
          <div className="emptyActivity">
            <span className="emptyActivityIcon">{latestJob ? <Radar size={20} aria-hidden="true" /> : <LockKeyhole size={20} aria-hidden="true" />}</span>
            <div><strong>{latestJob ? `${latestJob.company} · ${latestJob.title}` : latestRun ? `${latestRun.sourceName} source check completed.` : "No discovery activity has run."}</strong><p>{latestJob ? `${latestJob.source.importMethod === "public_feed" ? "Publicly discovered" : "Manually imported"}, normalized, and scored ${latestJob.match.score}/100. Source provenance is retained in the dossier.` : latestRun ? `${latestRun.fetchedCount} published roles checked; ${latestRun.newCount} entered the campaign and ${latestRun.closedCount} were marked closed.` : "Source checks, prepared applications, approvals, and submissions will appear here with timestamps and reasons."}</p></div>
          </div>
          <div className="activitySummary">
            <span><b>{campaign.jobs.length}</b> roles discovered</span>
            <span><b>{reviewCount}</b> awaiting review</span>
            <span><b>{campaign.sources.length}</b> live sources</span>
          </div>
        </section>
      </div>
    </div>
  );
}
