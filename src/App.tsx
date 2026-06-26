import { useEffect, useState } from "react";
import { AppChrome } from "./components/AppChrome";
import { useCampaignDraft } from "./hooks/useCampaignDraft";
import { CommandCenter } from "./pages/CommandCenter";
import { DiscoveryWorkspace } from "./pages/DiscoveryWorkspace";
import { GatedWorkspace } from "./pages/GatedWorkspace";
import { JobDossier } from "./pages/JobDossier";
import { LaunchExperience } from "./pages/LaunchExperience";
import { ReviewWorkspace } from "./pages/ReviewWorkspace";
import { RulesWorkspace } from "./pages/RulesWorkspace";
import type { AppView } from "./types";

export default function App() {
  const { campaign, updateCampaign, resetCampaign, draftState, draftError } = useCampaignDraft();
  const [activeView, setActiveView] = useState<AppView>("launch");
  const [hasSelectedInitialView, setHasSelectedInitialView] = useState(false);

  useEffect(() => {
    if (draftState === "loading" || hasSelectedInitialView) return;
    setActiveView(
      campaign.status === "ready"
        ? "command"
        : campaign.status === "intake_in_progress"
          ? "intake"
          : "launch"
    );
    setHasSelectedInitialView(true);
  }, [campaign.status, draftState, hasSelectedInitialView]);

  useEffect(() => {
    if (!hasSelectedInitialView) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("workspace-content")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeView, hasSelectedInitialView]);

  return (
    <AppChrome
      activeView={activeView}
      campaign={campaign}
      draftError={draftError}
      draftState={draftState}
      onNavigate={setActiveView}
    >
      {activeView === "launch" || activeView === "intake" ? (
        <LaunchExperience
          campaign={campaign}
          onNavigate={setActiveView}
          updateCampaign={updateCampaign}
        />
      ) : null}

      {activeView === "command" ? (
        <CommandCenter campaign={campaign} onNavigate={setActiveView} />
      ) : null}

      {activeView === "search" ? (
        campaign.status === "ready" ? (
          <DiscoveryWorkspace campaign={campaign} onNavigate={setActiveView} updateCampaign={updateCampaign} />
        ) : (
          <GatedWorkspace view="search" campaign={campaign} onNavigate={setActiveView} />
        )
      ) : null}

      {activeView === "review" ? (
        campaign.status === "ready" ? (
          <ReviewWorkspace campaign={campaign} onNavigate={setActiveView} updateCampaign={updateCampaign} />
        ) : (
          <GatedWorkspace view="review" campaign={campaign} onNavigate={setActiveView} />
        )
      ) : null}

      {activeView === "dossier" ? (
        <JobDossier campaign={campaign} onNavigate={setActiveView} updateCampaign={updateCampaign} />
      ) : null}

      {activeView === "rules" ? (
        <RulesWorkspace
          campaign={campaign}
          onNavigate={setActiveView}
          onReset={resetCampaign}
          updateCampaign={updateCampaign}
        />
      ) : null}

      {!["launch", "intake", "command", "search", "review", "dossier", "rules"].includes(activeView) ? (
        <GatedWorkspace view={activeView} campaign={campaign} onNavigate={setActiveView} />
      ) : null}
    </AppChrome>
  );
}
