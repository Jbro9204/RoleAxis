import { ArrowRight, BriefcaseBusiness, FileText, KeyRound, LockKeyhole, Radar, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppView, CampaignDraft } from "../types";

const viewDetails: Record<string, { label: string; title: string; detail: string; icon: LucideIcon; next: string }> = {
  search: { label: "Discovery", title: "Find signal without creating noise.", detail: "Discovery will search configured sources, normalize duplicate roles, and explain fit before anything enters review.", icon: Radar, next: "Source connections and match verification" },
  review: { label: "Review desk", title: "Every prepared application earns a reason.", detail: "The review desk will place match evidence, resume changes, risky answers, and portal behavior in one decision surface.", icon: SlidersHorizontal, next: "Candidate dossier and approval workflow" },
  applied: { label: "Applied record", title: "A complete record, not a vanity counter.", detail: "Submitted roles will retain the exact documents, answers, portal evidence, confirmation, and follow-up date.", icon: BriefcaseBusiness, next: "Verified submission and proof capture" },
  documents: { label: "Documents", title: "Every tailored claim must point home.", detail: "Document versions will preserve the master source, changed language, supporting facts, approvals, and export history.", icon: FileText, next: "Resume versioning and truth trace" },
  vault: { label: "Credential vault", title: "Portal access belongs behind a hard boundary.", detail: "Normal records will show only portal, login email, account state, and a vault reference—never a plain-text secret.", icon: KeyRound, next: "Encrypted vault adapter and account policy" },
  interviews: { label: "Interview studio", title: "Prepare from what was actually submitted.", detail: "Interview workspaces will use the exact job description, resume, application answers, concerns, and company notes.", icon: Sparkles, next: "Interview promotion and preparation workflow" }
};

export function GatedWorkspace({ view, campaign, onNavigate }: { view: AppView; campaign: CampaignDraft; onNavigate: (view: AppView) => void }) {
  const detail = viewDetails[view] ?? viewDetails.search;
  const Icon = detail.icon;
  const setupReady = campaign.status === "ready";
  return (
    <div className="gatedWorkspace pageEntrance">
      <section className="gateStatement">
        <span className="gateIcon"><Icon size={25} aria-hidden="true" /></span>
        <span className="sectionKicker">{detail.label}</span>
        <h1>{detail.title}</h1>
        <p>{detail.detail}</p>
      </section>
      <section className="gateBoundary">
        <div className="boundaryRule" aria-hidden="true"><span /><LockKeyhole size={18} /><span /></div>
        <div className="boundaryCopy">
          <span className="sectionKicker">Integrity gate</span>
          <h2>{setupReady ? "The campaign foundation is ready. This capability is not connected yet." : "This stage opens only after campaign calibration."}</h2>
          <p>{setupReady ? `The next verified build slice is ${detail.next.toLowerCase()}. RoleAxis will not imply that an integration works before it can be tested end to end.` : "Complete the truth profile and permission rules first. This prevents later workflows from acting on guesses or incomplete boundaries."}</p>
        </div>
        <div className="gateChecklist">
          <div className={campaign.resume ? "complete" : ""}><span>{campaign.resume ? <ShieldCheck size={15} /> : "01"}</span><strong>Truth profile</strong><em>{campaign.resume ? "Started" : "Required"}</em></div>
          <div className={setupReady ? "complete" : ""}><span>{setupReady ? <ShieldCheck size={15} /> : "02"}</span><strong>Campaign rules</strong><em>{setupReady ? "Complete" : "Required"}</em></div>
          <div><span>03</span><strong>{detail.next}</strong><em>Build gate</em></div>
        </div>
        <button className="actionButton primary" type="button" onClick={() => onNavigate(setupReady ? "command" : campaign.resume ? "intake" : "launch")}>
          {setupReady ? "Return to command" : campaign.resume ? "Continue calibration" : "Start with resume"}<ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
