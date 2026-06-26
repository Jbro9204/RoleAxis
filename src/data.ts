import applicationQuestionLibrary from "../data/templates/application-question-library.json";
import automationRulesTemplate from "../data/templates/automation-rules-template.json";
import intakeQuestionSet from "../data/templates/intake-question-set.json";
import emptyUserProfile from "../data/templates/empty-user-profile.json";
import type { FoundationCategory, IntakeSection } from "./types";

export const foundation = {
  applicationQuestionLibrary,
  automationRulesTemplate,
  intakeQuestionSet,
  emptyUserProfile
};

export const questionCategories = applicationQuestionLibrary.categories as FoundationCategory[];
export const intakeSections = intakeQuestionSet.sections as IntakeSection[];
