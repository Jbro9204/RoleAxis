import { AlertTriangle, Check, Database, LockKeyhole, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { foundation } from "../data";
import type { AppView, CampaignDraft } from "../types";

const modeDetails: Array<{
  key: CampaignDraft["automationMode"];
  name: string;
  detail: string;
  search: boolean;
  prepare: boolean;
  submit: string;
}> = [
  { key: "prepare_only", name: "Prepare only", detail: "Discover, score, tailor, and draft. Nothing can submit.", search: true, prepare: true, submit: "Never" },
  { key: "approval_required", name: "Approval required", detail: "Prepare complete applications and return every final submission to you.", search: true, prepare: true, submit: "After approval" },
  { key: "trusted_auto_apply", name: "Trusted auto-apply", detail: "Submit only when every configured rule and verification gate passes.", search: true, prepare: true, submit: "Rules permit" },
  { key: "high_volume", name: "High volume", detail: "Search broadly while retaining the same sensitive and unsupported-answer stops.", search: true, prepare: true, submit: "Rules permit" }
];

const checkpointLabels: Record<string, string> = {
  sensitiveAnswers: "Sensitive or voluntary answer",
  salaryQuestions: "Compensation question",
  customWrittenAnswers: "Custom written response",
  finalAttestations: "Final attestation or signature",
  missingRequiredQualifications: "Unsupported required qualification",
  unsupportedQuestions: "Unknown question category"
};

export function RulesWorkspace({
  campaign,
  onNavigate,
  onReset,
  updateCampaign
}: {
  campaign: CampaignDraft;
  onNavigate: (view: AppView) => void;
  onReset: () => Promise<void>;
  updateCampaign: (update: (current: CampaignDraft) => CampaignDraft) => void;
}) {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const rules = foundation.automationRulesTemplate;

  useEffect(() => {
    if (!showResetDialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showResetDialog]);

  async function resetWorkspace() {
    setIsResetting(true);
    setResetError(null);
    try {
      await onReset();
      setShowResetDialog(false);
      onNavigate("launch");
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "The local campaign could not be cleared.");
    } finally {
      setIsResetting(false);
    }
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !isResetting) {
      setShowResetDialog(false);
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="rulesWorkspace pageEntrance">
      <div className="workspaceHeading rulesHeading">
        <div><span className="sectionKicker">Control room</span><h1>Set the outer limit. Keep the hard stops.</h1><p>Automation can move quickly only inside boundaries you can see and change.</p></div>
        <div className="ruleStatus"><ShieldCheck size={19} aria-hidden="true" /><span><strong>Conservative stops active</strong><em>Unknown and sensitive questions pause</em></span></div>
      </div>

      <section className="modeSection" aria-labelledby="mode-heading">
        <div className="sectionLead"><span className="sectionKicker">Automation posture</span><h2 id="mode-heading">Choose how far RoleAxis may proceed.</h2><p>The selected mode never overrides a hard safety stop.</p></div>
        <div className="modeSelector">
          {modeDetails.map((mode) => {
            const selected = campaign.automationMode === mode.key;
            return (
              <button key={mode.key} className={`modeOption ${selected ? "selected" : ""}`} type="button" onClick={() => updateCampaign((current) => ({ ...current, automationMode: mode.key }))}>
                <span className="modeMarker">{selected ? <Check size={15} aria-hidden="true" /> : null}</span>
                <span className="modeName">{mode.name}</span>
                <span className="modeDetail">{mode.detail}</span>
                <span className="modePermission"><b>Search</b><em>{mode.search ? "Allowed" : "No"}</em></span>
                <span className="modePermission"><b>Prepare</b><em>{mode.prepare ? "Allowed" : "No"}</em></span>
                <span className="modePermission"><b>Submit</b><em>{mode.submit}</em></span>
              </button>
            );
          })}
        </div>
        <div className="thresholdDeck">
          <label className="scoreThreshold">
            <span><strong>Review threshold</strong><em>Roles at or above this evidence score can be recommended for review.</em></span>
            <div><input type="range" min="40" max="100" step="1" value={campaign.matchThreshold} onChange={(event) => updateCampaign((current) => ({ ...current, matchThreshold: Number(event.target.value) }))} aria-label="Minimum match score for review" /><output>{campaign.matchThreshold}</output></div>
          </label>
          <label className="dailyLimit">
            <span><strong>Daily application ceiling</strong><em>A future runner may never exceed this limit.</em></span>
            <div><input type="number" min="0" max="100" value={campaign.dailyApplicationLimit} onChange={(event) => updateCampaign((current) => ({ ...current, dailyApplicationLimit: Math.min(100, Math.max(0, Number(event.target.value))) }))} /><span>per day</span></div>
          </label>
        </div>
      </section>

      <div className="rulesLowerDeck">
        <section className="hardStops" aria-labelledby="stops-heading">
          <div className="sectionLead"><span className="sectionKicker">Hard stops</span><h2 id="stops-heading">These return control to you.</h2></div>
          <div className="stopList">
            {Object.entries(rules.approvalCheckpoints).map(([key, enabled]) => (
              <div key={key} className="stopRow"><span><LockKeyhole size={15} aria-hidden="true" /></span><strong>{checkpointLabels[key] ?? key}</strong><em>{enabled ? "Always pause" : "Rule-based"}</em></div>
            ))}
          </div>
        </section>

        <section className="privacyControl" aria-labelledby="privacy-heading">
          <div className="sectionLead"><span className="sectionKicker">Local data boundary</span><h2 id="privacy-heading">Your current workspace lives on this device.</h2></div>
          <div className="privacyDiagram">
            <span><Database size={19} aria-hidden="true" /></span><i /><span><LockKeyhole size={19} aria-hidden="true" /></span><i /><span><ShieldCheck size={19} aria-hidden="true" /></span>
          </div>
          <dl>
            <div><dt>Campaign draft</dt><dd>Encrypted in this browser</dd></div>
            <div><dt>Original resume</dt><dd>Not retained</dd></div>
            <div><dt>Portal secrets</dt><dd>None stored</dd></div>
            <div><dt>Network submission</dt><dd>None configured</dd></div>
          </dl>
          <button className="dangerButton" type="button" onClick={() => setShowResetDialog(true)}><Trash2 size={15} aria-hidden="true" /> Clear local campaign</button>
        </section>
      </div>

      {showResetDialog ? (
        <div className="dialogBackdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowResetDialog(false); }}>
          <section ref={dialogRef} className="confirmationDialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-detail" onKeyDown={handleDialogKeyDown}>
            <button className="dialogClose" type="button" onClick={() => setShowResetDialog(false)} aria-label="Close" disabled={isResetting}><X size={18} /></button>
            <span className="dialogIcon"><AlertTriangle size={23} aria-hidden="true" /></span>
            <span className="sectionKicker">Irreversible local action</span>
            <h2 id="reset-title">Clear this campaign?</h2>
            <p id="reset-detail">The encrypted draft, verified facts, and intake answers will be removed from this browser. The source resume has already been discarded.</p>
            {resetError ? <div className="inlineMessage error" role="alert">{resetError}</div> : null}
            <div className="dialogActions"><button ref={cancelButtonRef} className="actionButton secondary" type="button" onClick={() => setShowResetDialog(false)} disabled={isResetting}>Keep campaign</button><button className="dangerButton solid" type="button" onClick={resetWorkspace} disabled={isResetting}>{isResetting ? "Clearing…" : "Clear campaign"}</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
