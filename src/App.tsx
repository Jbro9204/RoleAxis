import { useEffect, useState } from "react";
import { AppChrome } from "./components/AppChrome";
import { useCampaignDraft } from "./hooks/useCampaignDraft";
import { CommandCenter } from "./pages/CommandCenter";
import { GatedWorkspace } from "./pages/GatedWorkspace";
import { LaunchExperience } from "./pages/LaunchExperience";
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

      {activeView === "rules" ? (
        <RulesWorkspace
          campaign={campaign}
          onNavigate={setActiveView}
          onReset={resetCampaign}
          updateCampaign={updateCampaign}
        />
      ) : null}

      {!["launch", "intake", "command", "rules"].includes(activeView) ? (
        <GatedWorkspace view={activeView} campaign={campaign} onNavigate={setActiveView} />
      ) : null}
    </AppChrome>
  );
}
