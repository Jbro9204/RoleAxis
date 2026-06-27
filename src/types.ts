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
  | "rules"
  | "dossier";

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

export type JobRemoteType = "remote" | "hybrid" | "onsite" | "unknown";
export type JobStatus = "found" | "review_queue" | "saved" | "skipped" | "applied" | "interviewing" | "closed";
export type JobOutcome = "apply_now" | "prepare_for_review" | "ask_user" | "save_for_later" | "skip" | "blocked";

export type SourceConnection = {
  sourceId: string;
  organizationName: string;
  boardUrl: string;
  status: "ready" | "attention";
  connectedAt: string;
  lastCheckedAt: string | null;
  lastSuccessfulRunAt: string | null;
  lastError: string | null;
};

export type SearchRun = {
  runId: string;
  sourceId: string;
  sourceName: string;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "success" | "partial" | "failed";
  fetchedCount: number;
  newCount: number;
  updatedCount: number;
  duplicateCount: number;
  unusableCount: number;
  closedCount: number;
  errorMessage: string | null;
};

export type JobSource = {
  sourceId: string | null;
  name: string;
  url: string;
  externalId: string;
  portalType: string;
  importMethod: "manual" | "public_feed";
  retrievedAt: string;
  lastSeenAt: string;
  active: boolean;
};

export type JobSalary = {
  minimum: number | null;
  maximum: number | null;
  currency: string;
  period: "hour" | "year" | "month" | "week" | "unknown";
  rawText: string;
};

export type MatchDimension = {
  key: "title" | "skills" | "location" | "compensation" | "requirements";
  label: string;
  score: number;
  maximum: number;
  summary: string;
};

export type JobMatch = {
  score: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  breakdown: MatchDimension[];
};

export type JobRecord = {
  schemaVersion: "1.1.0";
  jobId: string;
  fingerprint: string;
  source: JobSource;
  sources: JobSource[];
  company: string;
  title: string;
  location: string;
  remoteType: JobRemoteType;
  salary: JobSalary;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  keywords: string[];
  status: JobStatus;
  outcome: JobOutcome;
  match: JobMatch;
  review: {
    decisionReason: string | null;
    decidedAt: string | null;
  };
  matchFeedback: {
    rating: "accurate" | "too_high" | "too_low";
    note: string;
    updatedAt: string;
  } | null;
  metadata: {
    discoveredAt: string;
    updatedAt: string;
    expiresAt: string | null;
    lastSeenAt: string;
    sourceUpdatedAt: string | null;
  };
};

export type JobImportInput = {
  url: string;
  company: string;
  title: string;
  location: string;
  remoteType: JobRemoteType;
  salaryMinimum: number | null;
  salaryMaximum: number | null;
  salaryCurrency: string;
  salaryPeriod: JobSalary["period"];
  description: string;
};

export type CampaignDraft = {
  schemaVersion: "1.2.0";
  campaignId: string;
  status: CampaignStatus;
  resume: ResumeRecord | null;
  answers: Record<string, IntakeAnswer>;
  jobs: JobRecord[];
  sources: SourceConnection[];
  searchRuns: SearchRun[];
  selectedJobId: string | null;
  activeSectionKey: string;
  automationMode: "prepare_only" | "approval_required" | "trusted_auto_apply" | "high_volume";
  matchThreshold: number;
  dailyApplicationLimit: number;
  createdAt: string;
  updatedAt: string;
};

export type ResumeReadResult = {
  text: string;
  pageCount?: number;
  fileType: string;
};
