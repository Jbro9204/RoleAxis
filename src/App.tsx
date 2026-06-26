import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  FileText,
  Gauge,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  UsersRound
} from "lucide-react";
import { useMemo, useState } from "react";
import { attentionItems, campaignMetrics, foundation, intakeSections, questionCategories, workflowStates } from "./data";
import brandLogo from "../assets/brand/roleaxis-transparent.png";
import type { Metric, NavigationItem, PageKey, WorkItem } from "./types";

const navItems: NavigationItem[] = [
  { key: "launch", label: "Launch", summary: "Resume intake", icon: UploadCloud },
  { key: "command", label: "Command", summary: "Campaign state", icon: LayoutDashboard },
  { key: "search", label: "Search", summary: "Discovery rules", icon: Search },
  { key: "review", label: "Review", summary: "Approval desk", icon: ClipboardCheck },
  { key: "applied", label: "Applied", summary: "Submitted record", icon: BriefcaseBusiness },
  { key: "job", label: "Dossier", summary: "Role detail", icon: Compass },
  { key: "documents", label: "Documents", summary: "Resume versions", icon: FileText },
  { key: "vault", label: "Vault", summary: "Portal access", icon: KeyRound },
  { key: "interviews", label: "Interviews", summary: "Prep studio", icon: MessageSquareText },
  { key: "settings", label: "Settings", summary: "Automation rules", icon: Settings }
];

const pageTitles: Record<PageKey, string> = {
  launch: "Launch and Intake",
  command: "Command Center",
  search: "Search Console",
  review: "Review Queue",
  applied: "Applied Jobs",
  job: "Job Dossier",
  documents: "Documents",
  vault: "Credential Vault",
  interviews: "Interviews",
  settings: "Settings and Rules"
};

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>("launch");
  const [intakeSectionKey, setIntakeSectionKey] = useState(intakeSections[0]?.key ?? "");
  const [automationMode, setAutomationMode] = useState("approval_required");
  const selectedIntakeSection = useMemo(
    () => intakeSections.find((section) => section.key === intakeSectionKey) ?? intakeSections[0],
    [intakeSectionKey]
  );

  return (
    <main className="appShell">
      <aside className="axisRail" aria-label="RoleAxis workflow">
        <div className="brandBlock">
          <img src={brandLogo} alt="RoleAxis" />
          <span>Campaign workspace</span>
        </div>

        <nav className="workflowNav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activePage === item.key ? "navItem active" : "navItem"}
                type="button"
                onClick={() => setActivePage(item.key)}
                aria-current={activePage === item.key ? "page" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.summary}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="railFooter">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Truth-first automation. Sensitive answers pause by default.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topBar">
          <div>
            <span className="eyebrow">RoleAxis campaign workspace</span>
            <h1>{pageTitles[activePage]}</h1>
          </div>
          <div className="topActions" aria-label="Current readiness">
            <span className="statusPill">
              <RadioTower size={15} aria-hidden="true" />
              File-backed foundation
            </span>
            <button className="primaryAction" type="button" onClick={() => setActivePage("launch")}>
              Start intake
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        {activePage === "launch" && (
          <LaunchPage selectedSection={selectedIntakeSection} setIntakeSectionKey={setIntakeSectionKey} />
        )}
        {activePage === "command" && <CommandPage setActivePage={setActivePage} />}
        {activePage === "search" && <SearchPage />}
        {activePage === "review" && <ReviewPage setActivePage={setActivePage} />}
        {activePage === "applied" && <AppliedPage />}
        {activePage === "job" && <DossierPage />}
        {activePage === "documents" && <DocumentsPage />}
        {activePage === "vault" && <VaultPage />}
        {activePage === "interviews" && <InterviewsPage />}
        {activePage === "settings" && (
          <SettingsPage automationMode={automationMode} setAutomationMode={setAutomationMode} />
        )}
      </section>
    </main>
  );
}

function LaunchPage({
  selectedSection,
  setIntakeSectionKey
}: {
  selectedSection: (typeof intakeSections)[number];
  setIntakeSectionKey: (key: string) => void;
}) {
  return (
    <div className="pageGrid launchGrid">
      <section className="heroPanel">
        <div className="heroCopy">
          <span className="eyebrow">When applying feels like too much</span>
          <h2>RoleAxis helps carry the process.</h2>
          <p>
            Start with a resume, confirm the truth profile, then let the system shape a campaign that searches,
            prepares, pauses, and tracks with care.
          </p>
        </div>
        <div className="uploadWell" role="region" aria-label="Resume intake">
          <UploadCloud size={34} aria-hidden="true" />
          <strong>Resume intake surface</strong>
          <span>Upload stays locked until profile storage is connected.</span>
          <button className="secondaryAction" type="button" disabled>
            Upload locked
          </button>
        </div>
      </section>

      <section className="panel intakePanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Guided intake</span>
            <h3>{selectedSection.label}</h3>
          </div>
          <span className="countBadge">{selectedSection.questions.length} questions</span>
        </div>

        <div className="sectionTabs" aria-label="Intake sections">
          {intakeSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={selectedSection.key === section.key ? "chipButton active" : "chipButton"}
              onClick={() => setIntakeSectionKey(section.key)}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="questionList">
          {selectedSection.questions.map((question) => (
            <article key={question.key} className="questionRow">
              <div>
                <strong>{question.prompt}</strong>
                <span>{question.category.replaceAll("_", " ")} - {question.automationMode.replaceAll("_", " ")}</span>
              </div>
              <RiskBadge risk={question.riskLevel} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CommandPage({ setActivePage }: { setActivePage: (page: PageKey) => void }) {
  return (
    <div className="pageStack">
      <section className="metricGrid">
        {campaignMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="widePanel commandMap">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Campaign map</span>
            <h3>The user starts with clarity before automation begins.</h3>
          </div>
          <button className="secondaryAction" type="button" onClick={() => setActivePage("review")}>
            Open review desk
          </button>
        </div>
        <div className="flowTrack">
          {workflowStates.map((item, index) => (
            <article key={item.label} className="flowNode">
              <span>{index + 1}</span>
              <strong>{item.label}</strong>
              <em>{item.status}</em>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="attentionGrid">
        {attentionItems.map((item) => (
          <WorkItemCard key={item.title} item={item} />
        ))}
      </section>
    </div>
  );
}

function SearchPage() {
  const rules = foundation.automationRulesTemplate;
  return (
    <div className="pageGrid twoColumn">
      <section className="panel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Search settings</span>
            <h3>Campaign rules are ready to collect user choices.</h3>
          </div>
          <Gauge size={22} aria-hidden="true" />
        </div>
        <dl className="ruleList">
          <div><dt>Remote preference</dt><dd>{rules.search.remotePreference}</dd></div>
          <div><dt>Employment type</dt><dd>{rules.search.employmentTypes.join(", ")}</dd></div>
          <div><dt>Daily application limit</dt><dd>{rules.application.dailyApplicationLimit}</dd></div>
          <div><dt>Minimum match score</dt><dd>{rules.application.minimumMatchScore}</dd></div>
        </dl>
      </section>

      <section className="panel quietState">
        <Search size={30} aria-hidden="true" />
        <h3>No search run yet</h3>
        <p>Role discovery starts after resume review and campaign targets are complete.</p>
        <button className="secondaryAction" type="button" disabled>Search locked</button>
      </section>
    </div>
  );
}

function ReviewPage({ setActivePage }: { setActivePage: (page: PageKey) => void }) {
  return (
    <div className="pageGrid reviewLayout">
      <section className="decisionDesk">
        <div className="deskTop">
          <span className="eyebrow">Approval desk</span>
          <h2>Nothing submits until the gates are real.</h2>
          <p>
            The review queue will compare the job, tailored materials, answer risks, portal behavior, and submission
            rules before anything leaves the system.
          </p>
        </div>
        <div className="gateList">
          {[
            "Truth profile verified",
            "Question category classified",
            "Sensitive answer approved",
            "Vault reference available",
            "Final attestation allowed"
          ].map((gate, index) => (
            <div key={gate} className="gateRow">
              <span>{index + 1}</span>
              <strong>{gate}</strong>
              <em>{index < 2 ? "Baseline ready" : "Locked pending review flow"}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="panel blockedPanel">
        <LockKeyhole size={28} aria-hidden="true" />
        <h3>Application submission is locked</h3>
        <p>That is intentional. Submissions stay locked until review gates, vault handling, and proof capture are complete.</p>
        <button className="secondaryAction" type="button" onClick={() => setActivePage("settings")}>
          Inspect rules
        </button>
      </section>
    </div>
  );
}

function AppliedPage() {
  return <EmptyLedger icon={Inbox} title="No submitted applications yet" detail="Once submission gates are active, every application will create a complete audit record here." />;
}

function DossierPage() {
  return (
    <div className="pageGrid twoColumn">
      <section className="panel dossierPanel">
        <span className="eyebrow">Dossier structure</span>
        <h3>Each opportunity will keep the full story together.</h3>
        <ul className="structuredList">
          <li>Original job description</li>
          <li>Extracted requirements and keywords</li>
          <li>Match reasoning and concerns</li>
          <li>Tailored documents and submitted answers</li>
          <li>Portal notes, confirmations, and status history</li>
        </ul>
      </section>
      <section className="panel quietState">
        <Compass size={30} aria-hidden="true" />
        <h3>No active job selected</h3>
        <p>Job dossiers appear after discovery creates the first structured role record.</p>
      </section>
    </div>
  );
}

function DocumentsPage() {
  return (
    <div className="pageGrid twoColumn">
      <section className="panel documentStack">
        <span className="eyebrow">Document control</span>
        <h3>Every tailored claim must trace back to verified experience.</h3>
        {["Master resume", "Tailored resume versions", "Cover letters", "Answer drafts", "Export history"].map((item) => (
          <div key={item} className="documentRow">
            <FileText size={18} aria-hidden="true" />
            <span>{item}</span>
            <em>Awaiting resume intake</em>
          </div>
        ))}
      </section>
      <section className="panel quietState">
        <CheckCircle2 size={30} aria-hidden="true" />
        <h3>Truth trace required</h3>
        <p>RoleAxis can reframe real experience, but it will not invent credentials or responsibilities.</p>
      </section>
    </div>
  );
}

function VaultPage() {
  return (
    <div className="pageGrid twoColumn">
      <section className="panel vaultPanel">
        <LockKeyhole size={30} aria-hidden="true" />
        <h3>Credential vault boundary</h3>
        <p>Application records will store portal, login email, and vault reference. Secrets stay out of normal records.</p>
      </section>
      <section className="panel rulePanel">
        <span className="eyebrow">Stored in applied records</span>
        <ul className="structuredList">
          <li>Portal name</li>
          <li>Login email</li>
          <li>Account status</li>
          <li>Vault reference</li>
        </ul>
      </section>
    </div>
  );
}

function InterviewsPage() {
  return (
    <div className="pageGrid twoColumn">
      <section className="panel interviewPanel">
        <UsersRound size={30} aria-hidden="true" />
        <h3>Interview prep will be role-specific.</h3>
        <p>When an application becomes an interview, RoleAxis will keep the job description, submitted resume, answers, notes, and follow-up drafts together.</p>
      </section>
      <section className="panel">
        <span className="eyebrow">Prep studio</span>
        <div className="practiceList">
          {["Likely topics", "Practice questions", "Talking points", "Follow-up drafts"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsPage({
  automationMode,
  setAutomationMode
}: {
  automationMode: string;
  setAutomationMode: (mode: string) => void;
}) {
  const modes = ["prepare_only", "approval_required", "trusted_auto_apply", "high_volume"];
  return (
    <div className="pageGrid settingsLayout">
      <section className="panel">
        <span className="eyebrow">Automation mode</span>
        <h3>Control how much RoleAxis can do without stopping.</h3>
        <div className="modeGrid">
          {modes.map((mode) => (
            <button
              key={mode}
              className={automationMode === mode ? "modeButton active" : "modeButton"}
              type="button"
              onClick={() => setAutomationMode(mode)}
            >
              <strong>{mode.replaceAll("_", " ")}</strong>
              <span>{mode === "approval_required" ? "Recommended until review gates are complete" : "Configured rule state"}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <span className="eyebrow">Pause rules</span>
        <div className="pauseList">
          {Object.entries(foundation.automationRulesTemplate.approvalCheckpoints).map(([key, enabled]) => (
            <div key={key} className="pauseRow">
              <span>{key.replaceAll("_", " ")}</span>
              <strong>{enabled ? "Pause" : "Allow"}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className={`metricCard ${metric.tone}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <p>{metric.detail}</p>
    </article>
  );
}

function WorkItemCard({ item }: { item: WorkItem }) {
  return (
    <article className={`workItem ${item.state}`}>
      <span>{item.state}</span>
      <strong>{item.title}</strong>
      <p>{item.detail}</p>
    </article>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  return <span className={`riskBadge ${risk}`}>{risk}</span>;
}

function EmptyLedger({
  icon: Icon,
  title,
  detail
}: {
  icon: typeof Inbox;
  title: string;
  detail: string;
}) {
  return (
    <section className="fullEmptyState">
      <Icon size={36} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="emptySteps">
        <span>Resume review</span>
        <span>Search run</span>
        <span>Approval gates</span>
        <span>Submission proof</span>
      </div>
    </section>
  );
}
