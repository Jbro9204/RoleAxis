import type { LucideIcon } from "lucide-react";

export type PageKey =
  | "launch"
  | "command"
  | "search"
  | "review"
  | "applied"
  | "job"
  | "documents"
  | "vault"
  | "interviews"
  | "settings";

export type NavigationItem = {
  key: PageKey;
  label: string;
  summary: string;
  icon: LucideIcon;
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  tone: "teal" | "navy" | "amber" | "green";
};

export type WorkItem = {
  title: string;
  detail: string;
  state: "ready" | "attention" | "blocked" | "quiet";
};

export type FoundationCategory = {
  key: string;
  label: string;
  defaultRiskLevel: string;
  defaultAutomationMode: string;
  sensitivity: string;
  examplePrompts: string[];
  notes: string;
};

export type IntakeQuestion = {
  key: string;
  category: string;
  riskLevel: string;
  automationMode: string;
  sensitivity: string;
  prompt: string;
};

export type IntakeSection = {
  key: string;
  label: string;
  questions: IntakeQuestion[];
};

