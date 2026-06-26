import applicationQuestionLibrary from "../data/templates/application-question-library.json";
import automationRulesTemplate from "../data/templates/automation-rules-template.json";
import intakeQuestionSet from "../data/templates/intake-question-set.json";
import emptyUserProfile from "../data/templates/empty-user-profile.json";
import type { FoundationCategory, IntakeSection, Metric, WorkItem } from "./types";

export const foundation = {
  applicationQuestionLibrary,
  automationRulesTemplate,
  intakeQuestionSet,
  emptyUserProfile
};

export const questionCategories = applicationQuestionLibrary.categories as FoundationCategory[];
export const intakeSections = intakeQuestionSet.sections as IntakeSection[];

export const campaignMetrics: Metric[] = [
  {
    label: "Foundation readiness",
    value: "Foundation",
    detail: "Workflow and data loading active",
    tone: "teal"
  },
  {
    label: "Question coverage",
    value: `${questionCategories.length}`,
    detail: "Application categories defined",
    tone: "navy"
  },
  {
    label: "Intake depth",
    value: `${intakeSections.reduce((total, section) => total + section.questions.length, 0)}`,
    detail: "Guided questions ready",
    tone: "green"
  },
  {
    label: "Automation posture",
    value: "Guarded",
    detail: "Sensitive answers pause by default",
    tone: "amber"
  }
];

export const attentionItems: WorkItem[] = [
  {
    title: "Resume intake is the first active workflow",
    detail: "Upload, parse, review, and confirm the truth profile before any search begins.",
    state: "attention"
  },
  {
    title: "Question library is loaded",
    detail: "Sensitive categories are ready for intake, approvals, and application gates.",
    state: "ready"
  },
  {
    title: "Application runner is locked",
    detail: "Submitting stays unavailable until rules, vault, and portal checks are complete.",
    state: "blocked"
  }
];

export const workflowStates = [
  {
    label: "Launch",
    status: "Ready for resume intake",
    detail: "The first user action is upload and profile review."
  },
  {
    label: "Search",
    status: "Waiting on campaign rules",
    detail: "Locations, titles, pay, and source preferences come from intake."
  },
  {
    label: "Apply",
    status: "Locked until checks exist",
    detail: "Automation gates prevent accidental or unsupported submissions."
  },
  {
    label: "Interview",
    status: "Ready for interview records",
    detail: "Interview prep will use the submitted materials and job record."
  }
];
