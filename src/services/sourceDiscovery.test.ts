import { describe, expect, it } from "vitest";
import type { CampaignDraft, SourceConnection } from "../types";
import { createRunningSearchRun, disconnectSourceConnection, reconcileSourceFeed, type SourceFeed } from "./sourceDiscovery";

function campaignFixture(): CampaignDraft {
  const now = "2026-06-26T12:00:00.000Z";
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
    schemaVersion: "1.2.0",
    campaignId: "campaign_test",
    status: "ready",
    resume: {
      id: "resume_test",
      fileName: "resume.txt",
      fileType: "Text document",
      fileSize: 100,
      importedAt: now,
      facts: [{ id: "skill-1", category: "skill", label: "Skill", value: "Workforce Planning", confidence: "high", included: true, verified: true }]
    },
    answers: {
      "search.target_titles": answer("search.target_titles", ["Operations Manager"]),
      "search.locations": answer("search.locations", ["Raleigh, NC"]),
      "search.remote_preference": answer("search.remote_preference", "hybrid"),
      "search.minimum_compensation": answer("search.minimum_compensation", 75000)
    },
    jobs: [],
    sources: [],
    searchRuns: [],
    selectedJobId: null,
    activeSectionKey: "identity_contact",
    automationMode: "approval_required",
    matchThreshold: 80,
    dailyApplicationLimit: 25,
    createdAt: now,
    updatedAt: now
  };
}

function connection(sourceId: string, organizationName = "Northstar Services"): SourceConnection {
  return {
    sourceId,
    organizationName,
    boardUrl: sourceId.includes("second") ? "https://jobs.lever.co/northstar" : "https://job-boards.greenhouse.io/northstar",
    status: "ready",
    connectedAt: "2026-06-26T12:00:00.000Z",
    lastCheckedAt: null,
    lastSuccessfulRunAt: null,
    lastError: null
  };
}

function feed(source: SourceConnection, jobs: SourceFeed["jobs"], fetchedAt: string, truncated = false): SourceFeed {
  return { source: { identifier: "northstar", boardUrl: source.boardUrl }, jobs, totalAvailable: jobs.length, truncated, fetchedAt };
}

const description = `Northstar is hiring an Operations Manager to lead workforce planning, service delivery, performance coaching, and measurable process improvement across a growing operation.\n\nRequirements\n- Workforce planning experience required\n- Advanced Excel skills preferred`;

function sourceJob(url: string, externalId: string): SourceFeed["jobs"][number] {
  return { externalId, url, title: "Operations Manager", location: "Raleigh, NC", remoteType: "hybrid", description, salaryMinimum: 90000, salaryMaximum: 115000, salaryCurrency: "USD", salaryPeriod: "year", sourceUpdatedAt: null };
}

describe("source reconciliation", () => {
  it("merges cross-source duplicates and closes only after every live receipt is inactive", () => {
    const first = connection("source_first");
    const firstRun = createRunningSearchRun(first, "2026-06-26T12:00:00.000Z");
    let campaign = reconcileSourceFeed({ ...campaignFixture(), sources: [first], searchRuns: [firstRun] }, first, firstRun, feed(first, [sourceJob("https://job-boards.greenhouse.io/northstar/jobs/1", "1")], "2026-06-26T12:00:01.000Z"));
    expect(campaign.jobs).toHaveLength(1);
    expect(campaign.searchRuns[0].newCount).toBe(1);

    const second = connection("source_second");
    const secondRun = createRunningSearchRun(second, "2026-06-26T12:01:00.000Z");
    campaign = reconcileSourceFeed({ ...campaign, sources: [second, ...campaign.sources], searchRuns: [secondRun, ...campaign.searchRuns] }, second, secondRun, feed(second, [sourceJob("https://jobs.lever.co/northstar/role-1", "role-1")], "2026-06-26T12:01:01.000Z"));
    expect(campaign.jobs).toHaveLength(1);
    expect(campaign.jobs[0].sources).toHaveLength(2);
    expect(campaign.searchRuns[0].duplicateCount).toBe(1);

    const firstEmpty = createRunningSearchRun(first, "2026-06-26T13:00:00.000Z");
    campaign = reconcileSourceFeed({ ...campaign, searchRuns: [firstEmpty, ...campaign.searchRuns] }, first, firstEmpty, feed(first, [], "2026-06-26T13:00:01.000Z"));
    expect(campaign.jobs[0].status).not.toBe("closed");

    const secondEmpty = createRunningSearchRun(second, "2026-06-26T13:01:00.000Z");
    campaign = reconcileSourceFeed({ ...campaign, searchRuns: [secondEmpty, ...campaign.searchRuns] }, second, secondEmpty, feed(second, [], "2026-06-26T13:01:01.000Z"));
    expect(campaign.jobs[0].status).toBe("closed");
    expect(campaign.searchRuns[0].closedCount).toBe(1);
  });

  it("never closes missing roles after a truncated run", () => {
    const source = connection("source_first");
    const initialRun = createRunningSearchRun(source, "2026-06-26T12:00:00.000Z");
    let campaign = reconcileSourceFeed({ ...campaignFixture(), sources: [source], searchRuns: [initialRun] }, source, initialRun, feed(source, [sourceJob("https://job-boards.greenhouse.io/northstar/jobs/1", "1")], "2026-06-26T12:00:01.000Z"));
    const truncatedRun = createRunningSearchRun(source, "2026-06-26T14:00:00.000Z");
    campaign = reconcileSourceFeed({ ...campaign, searchRuns: [truncatedRun, ...campaign.searchRuns] }, source, truncatedRun, feed(source, [], "2026-06-26T14:00:01.000Z", true));
    expect(campaign.jobs[0].status).toBe("found");
    expect(campaign.searchRuns[0].status).toBe("partial");
  });

  it("disconnects future checks without deleting historical receipts", () => {
    const source = connection("source_first");
    const run = createRunningSearchRun(source, "2026-06-26T12:00:00.000Z");
    const campaign = reconcileSourceFeed({ ...campaignFixture(), sources: [source], searchRuns: [run] }, source, run, feed(source, [sourceJob("https://job-boards.greenhouse.io/northstar/jobs/1", "1")], "2026-06-26T12:00:01.000Z"));
    const disconnected = disconnectSourceConnection(campaign, source.sourceId);
    expect(disconnected.sources).toHaveLength(0);
    expect(disconnected.jobs).toHaveLength(1);
    expect(disconnected.jobs[0].sources[0]).toMatchObject({ sourceId: source.sourceId, active: false });
  });
});
