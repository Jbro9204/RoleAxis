import {
  Archive,
  BriefcaseBusiness,
  Check,
  CircleUserRound,
  Compass,
  FileText,
  KeyRound,
  LayoutGrid,
  LockKeyhole,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import type { ReactNode } from "react";
import type { AppView, CampaignDraft, NavigationItem } from "../types";
import type { DraftState } from "../hooks/useCampaignDraft";
import { BrandLogo } from "./BrandLogo";

const navigation: NavigationItem[] = [
  { key: "command", label: "Command", shortLabel: "Command", icon: LayoutGrid, stage: "primary" },
  { key: "launch", label: "Profile", shortLabel: "Profile", icon: CircleUserRound, stage: "primary" },
  { key: "search", label: "Discover", shortLabel: "Discover", icon: Search, stage: "primary", requiresCampaign: true },
  { key: "review", label: "Review", shortLabel: "Review", icon: SlidersHorizontal, stage: "primary", requiresCampaign: true },
  { key: "applied", label: "Applied", shortLabel: "Applied", icon: BriefcaseBusiness, stage: "primary", requiresCampaign: true },
  { key: "interviews", label: "Interviews", shortLabel: "Interviews", icon: Sparkles, stage: "primary", requiresCampaign: true },
  { key: "documents", label: "Documents", shortLabel: "Docs", icon: FileText, stage: "utility" },
  { key: "vault", label: "Vault", shortLabel: "Vault", icon: KeyRound, stage: "utility" },
  { key: "rules", label: "Rules & privacy", shortLabel: "Rules", icon: Settings2, stage: "utility" }
];

const primaryNavigation = navigation.filter((item) => item.stage === "primary");
const utilityNavigation = navigation.filter((item) => item.stage === "utility");

function DraftIndicator({ state }: { state: DraftState }) {
  const label = state === "loading" ? "Opening private draft" : state === "saving" ? "Securing changes" : state === "error" ? "Draft needs attention" : "Private draft secured";
  return (
    <span className={`draftIndicator ${state}`} role="status">
      {state === "saved" ? <Check size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}
      {label}
    </span>
  );
}
function campaignLabel(campaign: CampaignDraft) {
  if (campaign.status === "ready") return "Campaign ready";
  if (campaign.status === "intake_in_progress") return "Setup in progress";
  if (campaign.status === "profile_review") return "Profile review";
  return "New campaign";
}

export function AppChrome({
  activeView,
  campaign,
  children,
  draftError,
  draftState,
  onNavigate
}: {
  activeView: AppView;
  campaign: CampaignDraft;
  children: ReactNode;
  draftError: string | null;
  draftState: DraftState;
  onNavigate: (view: AppView) => void;
}) {
  const selectedJob = campaign.jobs.find((job) => job.jobId === campaign.selectedJobId);
  return (
    <div className="applicationFrame">
      <a className="skipLink" href="#workspace-content">Skip to workspace</a>
      <header className="applicationHeader">
        <button className="brandButton" type="button" onClick={() => onNavigate("command")} aria-label="Open RoleAxis command center">
          <BrandLogo />
        </button>

        <nav className="campaignRoute" aria-label="Campaign stages">
          {primaryNavigation.map((item, index) => {
            const Icon = item.icon;
            const selected = activeView === item.key || (item.key === "launch" && activeView === "intake") || (item.key === "search" && activeView === "dossier");
            const locked = item.requiresCampaign && campaign.status !== "ready";
            return (
              <button
                key={item.key}
                className={`routeStop ${selected ? "selected" : ""} ${locked ? "locked" : ""}`}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={selected ? "page" : undefined}
                aria-label={`${item.label}${locked ? ", setup required" : ""}`}
              >
                <span className="routeIndex">{String(index + 1).padStart(2, "0")}</span>
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
                {locked ? <LockKeyhole className="routeLock" size={11} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="headerUtilities">
          <DraftIndicator state={draftState} />
          <div className="utilityMenu">
            {utilityNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  className={activeView === item.key ? "utilityButton selected" : "utilityButton"}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="contextRibbon">
        <div>
          <Compass size={15} aria-hidden="true" />
          <strong>{campaignLabel(campaign)}</strong>
          <span aria-hidden="true">/</span>
          <span>{activeView === "dossier" && selectedJob ? `${selectedJob.company} · ${selectedJob.title}` : campaign.resume?.fileName ?? "No resume added"}</span>
        </div>
        <div>
          <LockKeyhole size={14} aria-hidden="true" />
          <span>Local processing</span>
          <span aria-hidden="true">·</span>
          <span>Source file not retained</span>
        </div>
      </div>

      {draftError ? (
        <div className="systemNotice error" role="alert">
          <strong>Private draft unavailable.</strong>
          <span>{draftError}</span>
        </div>
      ) : null}

      <main id="workspace-content" className="workspaceContent" tabIndex={-1}>{children}</main>

      <nav className="mobileNavigation" aria-label="Mobile campaign navigation">
        {primaryNavigation.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const selected = activeView === item.key || (item.key === "launch" && activeView === "intake") || (item.key === "search" && activeView === "dossier");
          return (
            <button key={item.key} type="button" className={selected ? "selected" : ""} onClick={() => onNavigate(item.key)}>
              <Icon size={19} aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
        <button type="button" className={activeView === "rules" ? "selected" : ""} onClick={() => onNavigate("rules")}>
          <Archive size={19} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
