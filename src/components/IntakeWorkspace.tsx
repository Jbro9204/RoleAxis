import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { intakeSections } from "../data";
import type { CampaignDraft, IntakeAnswer, IntakeQuestion, IntakeValue } from "../types";
import { hasIntakeValue, IntakeQuestionField } from "./IntakeQuestionField";

function makeAnswer(question: IntakeQuestion, value: IntakeValue): IntakeAnswer {
  const approved = hasIntakeValue(value);
  const now = new Date().toISOString();
  return {
    questionKey: question.key,
    prompt: question.prompt,
    category: question.category,
    riskLevel: question.riskLevel,
    automationMode: question.automationMode,
    sensitivity: question.sensitivity,
    value,
    source: "intake",
    approved,
    approvedAt: approved ? now : null,
    updatedAt: now
  };
}

export function IntakeWorkspace({
  campaign,
  onBackToProfile,
  onComplete,
  onSaveExit,
  updateCampaign
}: {
  campaign: CampaignDraft;
  onBackToProfile: () => void;
  onComplete: () => void;
  onSaveExit: () => void;
  updateCampaign: (update: (current: CampaignDraft) => CampaignDraft) => void;
}) {
  const activeSectionIndex = Math.max(0, intakeSections.findIndex((section) => section.key === campaign.activeSectionKey));
  const activeSection = intakeSections[activeSectionIndex] ?? intakeSections[0];
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = activeSection.questions[questionIndex] ?? activeSection.questions[0];
  const answer = campaign.answers[question.key];
  const allQuestions = useMemo(() => intakeSections.flatMap((section) => section.questions), []);
  const completedCount = allQuestions.filter((item) => campaign.answers[item.key]?.approved && hasIntakeValue(campaign.answers[item.key]?.value)).length;
  const progress = Math.round((completedCount / allQuestions.length) * 100);
  const currentAnswered = answer?.approved && hasIntakeValue(answer.value);

  useEffect(() => setQuestionIndex(0), [campaign.activeSectionKey]);

  function sectionCompleted(sectionKey: string) {
    const section = intakeSections.find((item) => item.key === sectionKey);
    return Boolean(section?.questions.every((item) => campaign.answers[item.key]?.approved && hasIntakeValue(campaign.answers[item.key]?.value)));
  }

  function setSection(sectionKey: string) {
    updateCampaign((current) => ({ ...current, activeSectionKey: sectionKey }));
  }

  function setAnswer(value: IntakeValue) {
    updateCampaign((current) => ({
      ...current,
      status: "intake_in_progress",
      automationMode: question.key === "submission.automation_mode" && typeof value === "string"
        ? value as CampaignDraft["automationMode"]
        : current.automationMode,
      answers: { ...current.answers, [question.key]: makeAnswer(question, value) }
    }));
  }

  function goBack() {
    if (questionIndex > 0) {
      setQuestionIndex((index) => index - 1);
      return;
    }
    if (activeSectionIndex > 0) {
      const previous = intakeSections[activeSectionIndex - 1];
      updateCampaign((current) => ({ ...current, activeSectionKey: previous.key }));
      window.setTimeout(() => setQuestionIndex(previous.questions.length - 1), 0);
      return;
    }
    onBackToProfile();
  }

  function goForward() {
    if (!currentAnswered) return;
    if (questionIndex < activeSection.questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    if (activeSectionIndex < intakeSections.length - 1) {
      setSection(intakeSections[activeSectionIndex + 1].key);
      return;
    }
    if (completedCount === allQuestions.length) {
      onComplete();
      return;
    }
    const firstIncomplete = intakeSections.find((section) => !sectionCompleted(section.key));
    if (firstIncomplete) setSection(firstIncomplete.key);
  }

  return (
    <div className="intakeWorkspace pageEntrance">
      <div className="intakeTopline">
        <div>
          <span className="sectionKicker">Campaign calibration</span>
          <h1>Set the boundaries once. Keep control everywhere.</h1>
        </div>
        <div className="intakeProgress" aria-label={`${progress}% of intake complete`}>
          <div className="progressDial" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}>
            <span>{progress}%</span>
          </div>
          <div><strong>{completedCount} of {allQuestions.length}</strong><span>answers configured</span></div>
        </div>
      </div>

      <div className="intakeDeck">
        <aside className="intakeRoute" aria-label="Intake sections">
          <div className="routeIntro">
            <span>Setup route</span>
            <p>Move at your own pace. Your encrypted local draft saves as you go.</p>
          </div>
          {intakeSections.map((section, index) => {
            const completed = sectionCompleted(section.key);
            const selected = section.key === activeSection.key;
            const sectionAnswerCount = section.questions.filter((item) => campaign.answers[item.key]?.approved).length;
            return (
              <button key={section.key} type="button" className={`intakeRouteItem ${selected ? "selected" : ""}`} onClick={() => setSection(section.key)}>
                <span className="routeNode">{completed ? <Check size={14} aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</span>
                <span><strong>{section.label}</strong><small>{sectionAnswerCount}/{section.questions.length} configured</small></span>
              </button>
            );
          })}
          <button className="textButton saveExit" type="button" onClick={onSaveExit}>
            <Clock3 size={15} aria-hidden="true" /> Save and return to command
          </button>
        </aside>

        <section className="questionWorkbench" aria-live="polite">
          <div className="questionPosition">
            <span>{activeSection.label}</span>
            <span>Question {questionIndex + 1} of {activeSection.questions.length}</span>
          </div>
          <IntakeQuestionField question={question} value={answer?.value} onChange={setAnswer} />
          <div className="questionNavigation">
            <button className="actionButton secondary" type="button" onClick={goBack}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
            <div className="answerState">
              {currentAnswered ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
              <span>{currentAnswered ? "Answer secured" : "Choose or enter an answer to continue"}</span>
            </div>
            <button className="actionButton primary" type="button" onClick={goForward} disabled={!currentAnswered}>
              {activeSectionIndex === intakeSections.length - 1 && questionIndex === activeSection.questions.length - 1 ? "Finish calibration" : "Save and continue"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        <aside className="answerGuardrail">
          <span className="sectionKicker">Answer protocol</span>
          <div className="guardrailIcon"><ShieldCheck size={24} aria-hidden="true" /></div>
          <h2>{question.riskLevel === "restricted" ? "You hold the final say." : "Clear source. Clear boundary."}</h2>
          <p>
            {question.riskLevel === "restricted"
              ? "This category cannot be guessed or generalized. If an application phrases it differently, RoleAxis pauses."
              : "RoleAxis records where this answer came from and how it may be reused."}
          </p>
          <dl>
            <div><dt>Source</dt><dd>Direct from you</dd></div>
            <div><dt>Risk</dt><dd>{question.riskLevel}</dd></div>
            <div><dt>Reuse</dt><dd>{question.automationMode.replaceAll("_", " ")}</dd></div>
            <div><dt>Approval</dt><dd>{currentAnswered ? "Recorded" : "Waiting"}</dd></div>
          </dl>
          <div className="guardrailPromise">
            <LockKeyhole size={15} aria-hidden="true" />
            <span>Unknown wording always triggers review.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
