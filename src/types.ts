import type { LucideIcon } from "lucide-react";

export type AppView =
  | "launch"
  | "intake"
  | "command"
  | "search"
  | "review"
  | "applied"
  | "documents"
  | "vault"
  | "interviews"
  | "rules";

export type NavigationItem = {
  key: AppView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  stage: "primary" | "utility";
  requiresCampaign?: boolean;
};

export type RiskLevel = "low" | "medium" | "high" | "restricted";
export type AutomationMode = "safe_auto" | "ask_once" | "review_before_submit" | "manual_only";
export type Sensitivity = "public" | "internal" | "personal" | "sensitive" | "secret";

export type FoundationCategory = {
  key: string;
  label: string;
  defaultRiskLevel: RiskLevel;
  defaultAutomationMode: AutomationMode;
  sensitivity: Sensitivity;
  examplePrompts: string[];
  notes: string;
};

export type IntakeQuestion = {
  key: string;
  category: string;
  riskLevel: RiskLevel;
  automationMode: AutomationMode;
  sensitivity: Sensitivity;
  prompt: string;
};

export type IntakeSection = {
  key: string;
  label: string;
  questions: IntakeQuestion[];
};

export type FactCategory =
  | "identity"
  | "contact"
  | "experience"
  | "education"
  | "skill"
  | "certification"
  | "link";

export type FactConfidence = "high" | "medium" | "review";

export type ProfileFact = {
  id: string;
  category: FactCategory;
  label: string;
  value: string;
  confidence: FactConfidence;
  included: boolean;
  verified: boolean;
};

export type ResumeRecord = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  importedAt: string;
  pageCount?: number;
  facts: ProfileFact[];
};

export type IntakeValue = string | string[] | boolean | number | null;

export type IntakeAnswer = {
  questionKey: string;
  prompt: string;
  category: string;
  riskLevel: RiskLevel;
  automationMode: AutomationMode;
  sensitivity: Sensitivity;
  value: IntakeValue;
  source: "resume" | "intake" | "manual" | "system_default";
  approved: boolean;
  approvedAt: string | null;
  updatedAt: string;
};

export type CampaignStatus = "not_started" | "profile_review" | "intake_in_progress" | "ready";

export type CampaignDraft = {
  schemaVersion: "1.0.0";
  campaignId: string;
  status: CampaignStatus;
  resume: ResumeRecord | null;
  answers: Record<string, IntakeAnswer>;
  activeSectionKey: string;
  automationMode: "prepare_only" | "approval_required" | "trusted_auto_apply" | "high_volume";
  createdAt: string;
  updatedAt: string;
};

export type ResumeReadResult = {
  text: string;
  pageCount?: number;
  fileType: string;
};
