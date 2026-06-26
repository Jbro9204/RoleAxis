import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CampaignDraft } from "../types";
import { clearCampaignDraft, createEmptyCampaign, loadCampaignDraft, saveCampaignDraft } from "../services/campaignStore";

export type DraftState = "loading" | "saved" | "saving" | "error";

export function useCampaignDraft() {
  const [campaign, setCampaignState] = useState<CampaignDraft>(() => createEmptyCampaign());
  const [draftState, setDraftState] = useState<DraftState>("loading");
  const [draftError, setDraftError] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    loadCampaignDraft()
      .then((stored) => {
        if (!active) return;
        if (stored) setCampaignState(stored);
        hydrated.current = true;
        setDraftState("saved");
      })
      .catch((error: unknown) => {
        if (!active) return;
        hydrated.current = true;
        setDraftState("error");
        setDraftError(error instanceof Error ? error.message : "The private workspace could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    setDraftState("saving");
    const timeout = window.setTimeout(() => {
      saveCampaignDraft(campaign)
        .then(() => {
          setDraftState("saved");
          setDraftError(null);
        })
        .catch((error: unknown) => {
          setDraftState("error");
          setDraftError(error instanceof Error ? error.message : "The campaign draft could not be saved.");
        });
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [campaign]);

  const updateCampaign = useCallback((update: (current: CampaignDraft) => CampaignDraft) => {
    setCampaignState((current) => ({ ...update(current), updatedAt: new Date().toISOString() }));
  }, []);

  const resetCampaign = useCallback(async () => {
    await clearCampaignDraft();
    const fresh = createEmptyCampaign();
    setCampaignState(fresh);
    setDraftState("saved");
    setDraftError(null);
  }, []);

  return useMemo(
    () => ({ campaign, updateCampaign, resetCampaign, draftState, draftError }),
    [campaign, updateCampaign, resetCampaign, draftState, draftError]
  );
}
