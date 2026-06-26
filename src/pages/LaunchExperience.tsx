import { ArrowRight, Compass, Eye, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { IntakeWorkspace } from "../components/IntakeWorkspace";
import { ProfileReview } from "../components/ProfileReview";
import { ResumeDropzone } from "../components/ResumeDropzone";
import { intakeSections } from "../data";
import { extractProfileFacts, readResume, ResumeReadError } from "../services/resumeReader";
import type { AppView, CampaignDraft, IntakeAnswer, ProfileFact } from "../types";

function answerFromFact(questionKey: string, value: string): IntakeAnswer | null {
  const question = intakeSections.flatMap((section) => section.questions).find((item) => item.key === questionKey);
  if (!question) return null;
  const now = new Date().toISOString();
  return {
    questionKey,
    prompt: question.prompt,
    category: question.category,
    riskLevel: question.riskLevel,
    automationMode: question.automationMode,
    sensitivity: question.sensitivity,
    value,
    source: "resume",
    approved: true,
    approvedAt: now,
    updatedAt: now
  };
}

function seedProfileAnswers(facts: ProfileFact[], existing: CampaignDraft["answers"]) {
  const answers = { ...existing };
  const mapping = [
    { key: "contact.legal_name", fact: facts.find((item) => item.included && item.verified && item.category === "identity") },
    { key: "contact.application_email", fact: facts.find((item) => item.included && item.verified && item.label === "Email") },
    { key: "contact.phone", fact: facts.find((item) => item.included && item.verified && item.label === "Phone") }
  ];
  for (const item of mapping) {
    if (!item.fact || answers[item.key]?.source === "intake") continue;
    const answer = answerFromFact(item.key, item.fact.value);
    if (answer) answers[item.key] = answer;
  }
  return answers;
}

export function LaunchExperience({
  campaign,
  onNavigate,
  updateCampaign
}: {
  campaign: CampaignDraft;
  onNavigate: (view: AppView) => void;
  updateCampaign: (update: (current: CampaignDraft) => CampaignDraft) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(!campaign.resume);

  async function handleFile(file: File) {
    setIsProcessing(true);
    setUploadError(null);
    try {
      const result = await readResume(file);
      const facts = extractProfileFacts(result.text);
      if (!facts.some((fact) => fact.category === "identity") || facts.length < 2) {
        throw new ResumeReadError("We could not identify enough reliable profile information. Try a text-based PDF or DOCX rather than a scanned image.");
      }
      updateCampaign((current) => ({
        ...current,
        status: "profile_review",
        resume: {
          id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `resume-${Date.now()}`,
          fileName: file.name,
          fileType: result.fileType,
          fileSize: file.size,
          importedAt: new Date().toISOString(),
          pageCount: result.pageCount,
          facts
        }
      }));
      setShowUploader(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The resume could not be read.");
    } finally {
      setIsProcessing(false);
    }
  }

  function updateFacts(facts: ProfileFact[]) {
    updateCampaign((current) => ({
      ...current,
      status: "profile_review",
      resume: current.resume ? { ...current.resume, facts } : null
    }));
  }

  function continueToIntake() {
    if (!campaign.resume) return;
    updateCampaign((current) => ({
      ...current,
      status: "intake_in_progress",
      answers: seedProfileAnswers(current.resume?.facts ?? [], current.answers)
    }));
    onNavigate("intake");
  }

  function finishIntake() {
    updateCampaign((current) => ({ ...current, status: "ready" }));
    onNavigate("command");
  }

  if (campaign.status === "intake_in_progress") {
    return (
      <IntakeWorkspace
        campaign={campaign}
        updateCampaign={updateCampaign}
        onBackToProfile={() => updateCampaign((current) => ({ ...current, status: "profile_review" }))}
        onComplete={finishIntake}
        onSaveExit={() => onNavigate("command")}
      />
    );
  }

  if (campaign.resume && !showUploader) {
    return (
      <ProfileReview
        resume={campaign.resume}
        onUpdateFacts={updateFacts}
        onReplace={() => setShowUploader(true)}
        onContinue={continueToIntake}
      />
    );
  }

  return (
    <div className="launchLanding pageEntrance">
      <section className="launchStatement">
        <div className="axisBeacon" aria-hidden="true">
          <span className="beaconRing ringOne" />
          <span className="beaconRing ringTwo" />
          <span className="beaconCross horizontal" />
          <span className="beaconCross vertical" />
          <span className="beaconNeedle" />
          <span className="beaconCore"><Compass size={29} /></span>
        </div>
        <span className="sectionKicker light">Campaign origin · 01</span>
        <h1>A job search should feel directed, not relentless.</h1>
        <p className="launchLead">RoleAxis turns your experience and boundaries into a controlled campaign—one you can understand, adjust, and trust.</p>
        <div className="launchAssurances">
          <span><ShieldCheck size={15} aria-hidden="true" /> Truth before tailoring</span>
          <span><Eye size={15} aria-hidden="true" /> Reasons before actions</span>
          <span><LockKeyhole size={15} aria-hidden="true" /> Permission before submission</span>
        </div>
        <div className="launchStepMark">
          <strong>01</strong>
          <span />
          <em>Resume<br />to truth profile</em>
        </div>
      </section>

      <section className="launchIntakePanel">
        {campaign.resume ? (
          <button className="textButton cancelReplace" type="button" onClick={() => setShowUploader(false)}>
            <RotateCcw size={15} aria-hidden="true" /> Keep {campaign.resume.fileName}
          </button>
        ) : null}
        <ResumeDropzone error={uploadError} isProcessing={isProcessing} onFile={handleFile} />
      </section>

      <section className="campaignContract" aria-label="RoleAxis campaign contract">
        <div className="contractIntro">
          <span className="sectionKicker">The campaign contract</span>
          <h2>You stay in command.</h2>
        </div>
        <div className="contractRule"><strong>01</strong><span><b>Facts stay factual.</b> Tailoring can sharpen language, never invent proof.</span></div>
        <div className="contractRule"><strong>02</strong><span><b>Pauses are explained.</b> Unknown, sensitive, or risky questions come back to you.</span></div>
        <div className="contractRule"><strong>03</strong><span><b>Every action leaves a record.</b> You can see what was prepared, approved, and submitted.</span></div>
        <button className="contractLink" type="button" onClick={() => onNavigate("rules")}>
          Read your control settings <ArrowRight size={15} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
