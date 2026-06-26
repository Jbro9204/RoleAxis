import { describe, expect, it } from "vitest";
import type { CampaignDraft, JobImportInput } from "../types";
import { canonicalizeJobUrl, createJobRecord, findDuplicateJob, JobImportError } from "./jobDiscovery";

function campaignFixture(): CampaignDraft {
  const now = new Date().toISOString();
  const answer = (questionKey: string, value: string | string[] | number) => ({
    questionKey,
    prompt: questionKey,
    category: "custom",
    riskLevel: "low" as const,
    automationMode: "safe_auto" as const,
    sensitivity: "internal" as const,
    value,
    source: "intake" as const,
    approved: true,
    approvedAt: now,
    updatedAt: now
  });
  return {
    schemaVersion: "1.1.0",
    campaignId: "campaign_test",
    status: "ready",
    resume: {
      id: "resume_test",
      fileName: "resume.txt",
      fileType: "Text document",
      fileSize: 100,
      importedAt: now,
      facts: [
        { id: "identity-1", category: "identity", label: "Name", value: "Alex Morgan", confidence: "high", included: true, verified: true },
        { id: "skill-1", category: "skill", label: "Skill", value: "Workforce Planning", confidence: "review", included: true, verified: true },
        { id: "skill-2", category: "skill", label: "Skill", value: "Excel", confidence: "review", included: true, verified: true },
        { id: "education-1", category: "education", label: "Education", value: "Bachelor of Science", confidence: "review", included: true, verified: true }
      ]
    },
    answers: {
      "search.target_titles": answer("search.target_titles", ["Operations Manager"]),
      "search.locations": answer("search.locations", ["Raleigh, NC"]),
      "search.remote_preference": answer("search.remote_preference", "hybrid"),
      "search.minimum_compensation": answer("search.minimum_compensation", 75000)
    },
    jobs: [],
    selectedJobId: null,
    activeSectionKey: "identity_contact",
    automationMode: "approval_required",
    matchThreshold: 80,
    dailyApplicationLimit: 25,
    createdAt: now,
    updatedAt: now
  };
}

const jobInput: JobImportInput = {
  url: "https://boards.greenhouse.io/northstar/jobs/12345?utm_source=newsletter&gh_jid=12345",
  company: "Northstar Services",
  title: "Senior Operations Manager",
  location: "Raleigh, NC",
  remoteType: "hybrid",
  salaryMinimum: 90000,
  salaryMaximum: 115000,
  salaryPeriod: "year",
  description: `We are hiring a Senior Operations Manager to lead workforce planning and performance.

Requirements
- Bachelor's degree or equivalent experience required
- Advanced Excel skills
- Five years of operations leadership experience

Preferred Qualifications
- Process improvement certification preferred`
};

describe("job discovery services", () => {
  it("canonicalizes source URLs without removing job identifiers", () => {
    expect(canonicalizeJobUrl(jobInput.url)).toBe("https://boards.greenhouse.io/northstar/jobs/12345?gh_jid=12345");
  });

  it("normalizes and scores a manually imported job with explanations", () => {
    const job = createJobRecord(jobInput, campaignFixture());
    expect(job.source.portalType).toBe("greenhouse");
    expect(job.match.score).toBeGreaterThanOrEqual(70);
    expect(job.match.breakdown).toHaveLength(5);
    expect(job.match.strengths.join(" ")).toMatch(/Workforce Planning|Excel/i);
    expect(job.requirements).toHaveLength(3);
    expect(job.match.concerns.join(" ")).toMatch(/five years/i);
  });

  it("detects duplicates by canonical source and role identity", () => {
    const campaign = campaignFixture();
    const job = createJobRecord(jobInput, campaign);
    const duplicate = createJobRecord({ ...jobInput, url: `${jobInput.url}&ref=homepage` }, campaign);
    expect(findDuplicateJob([job], duplicate)?.jobId).toBe(job.jobId);
  });

  it("rejects incomplete postings before matching", () => {
    expect(() => createJobRecord({ ...jobInput, description: "Too short" }, campaignFixture())).toThrow(JobImportError);
  });
});
