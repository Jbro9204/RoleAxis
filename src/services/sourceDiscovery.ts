import type {
  CampaignDraft,
  JobImportInput,
  JobRecord,
  JobSource,
  SearchRun,
  SourceConnection
} from "../types";
import { createJobRecord, findDuplicateJob } from "./jobDiscovery";

export type SourceFeedJob = {
  externalId: string;
  url: string;
  title: string;
  location: string;
  remoteType: JobImportInput["remoteType"];
  description: string;
  salaryMinimum: number | null;
  salaryMaximum: number | null;
  salaryCurrency: string;
  salaryPeriod: JobImportInput["salaryPeriod"];
  sourceUpdatedAt: string | null;
};

export type SourceFeed = {
  source: {
    identifier: string;
    boardUrl: string;
  };
  jobs: SourceFeedJob[];
  totalAvailable: number;
  truncated: boolean;
  fetchedAt: string;
};

export class SourceDiscoveryError extends Error {
  code: string;

  constructor(message: string, code = "source_unavailable") {
    super(message);
    this.name = "SourceDiscoveryError";
    this.code = code;
  }
}

function generateId(prefix: string) {
  return typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function fetchSourceFeed(boardUrl: string): Promise<SourceFeed> {
  let response: Response;
  try {
    response = await fetch(`/api/job-sources?sourceUrl=${encodeURIComponent(boardUrl.trim())}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
  } catch {
    throw new SourceDiscoveryError("The source service is not reachable. Nothing in the campaign was changed.");
  }

  const payload = await response.json().catch(() => null) as SourceFeed | { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : null;
    throw new SourceDiscoveryError(error?.message ?? "The public board could not be checked safely.", error?.code);
  }
  if (!payload || !("jobs" in payload) || !Array.isArray(payload.jobs) || !("source" in payload)) {
    throw new SourceDiscoveryError("The source service returned an incomplete receipt.", "invalid_source_response");
  }
  return payload;
}

export function createSourceConnection(organizationName: string, feed: SourceFeed): SourceConnection {
  return {
    sourceId: generateId("source"),
    organizationName: organizationName.trim(),
    boardUrl: feed.source.boardUrl,
    status: "ready",
    connectedAt: feed.fetchedAt,
    lastCheckedAt: null,
    lastSuccessfulRunAt: null,
    lastError: null
  };
}

export function createRunningSearchRun(connection: SourceConnection, startedAt = new Date().toISOString()): SearchRun {
  return {
    runId: generateId("run"),
    sourceId: connection.sourceId,
    sourceName: connection.organizationName,
    startedAt,
    completedAt: null,
    status: "running",
    fetchedCount: 0,
    newCount: 0,
    updatedCount: 0,
    duplicateCount: 0,
    unusableCount: 0,
    closedCount: 0,
    errorMessage: null
  };
}

function inputFromSourceJob(job: SourceFeedJob, organizationName: string): JobImportInput {
  return {
    url: job.url,
    company: organizationName,
    title: job.title,
    location: job.location,
    remoteType: job.remoteType,
    salaryMinimum: job.salaryMinimum,
    salaryMaximum: job.salaryMaximum,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    description: job.description
  };
}

function sourceReceipt(connection: SourceConnection, job: SourceFeedJob, fetchedAt: string): JobSource {
  return {
    sourceId: connection.sourceId,
    name: `${connection.organizationName} careers`,
    url: job.url,
    externalId: job.externalId,
    portalType: "supported_public_board",
    importMethod: "public_feed",
    retrievedAt: fetchedAt,
    lastSeenAt: fetchedAt,
    active: true
  };
}

function replaceReceipt(sources: JobSource[], receipt: JobSource) {
  const index = sources.findIndex((source) => source.sourceId === receipt.sourceId && source.externalId === receipt.externalId);
  if (index === -1) return [...sources, receipt];
  return sources.map((source, sourceIndex) => sourceIndex === index ? receipt : source);
}

function reconcileFoundJob(existing: JobRecord, candidate: JobRecord, receipt: JobSource): JobRecord {
  const preserveDecision = ["review_queue", "saved", "skipped", "applied", "interviewing"].includes(existing.status);
  return {
    ...candidate,
    jobId: existing.jobId,
    fingerprint: existing.fingerprint,
    status: existing.status === "closed" ? "found" : existing.status,
    outcome: preserveDecision ? existing.outcome : candidate.outcome,
    review: existing.review,
    matchFeedback: existing.matchFeedback,
    sources: replaceReceipt(existing.sources, receipt),
    metadata: {
      ...candidate.metadata,
      discoveredAt: existing.metadata.discoveredAt
    }
  };
}

function finalizeRun(runs: SearchRun[], result: SearchRun) {
  return [result, ...runs.filter((run) => run.runId !== result.runId)].slice(0, 50);
}

export function reconcileSourceFeed(campaign: CampaignDraft, connection: SourceConnection, running: SearchRun, feed: SourceFeed): CampaignDraft {
  let newCount = 0;
  let updatedCount = 0;
  let duplicateCount = 0;
  let unusableCount = 0;
  let closedCount = 0;
  let jobs = [...campaign.jobs];
  const seenExternalIds = new Set<string>();

  for (const sourceJob of feed.jobs) {
    const receipt = sourceReceipt(connection, sourceJob, feed.fetchedAt);
    try {
      const candidate = createJobRecord(inputFromSourceJob(sourceJob, connection.organizationName), campaign, {
        source: receipt,
        sourceUpdatedAt: sourceJob.sourceUpdatedAt,
        now: feed.fetchedAt
      });
      const duplicate = findDuplicateJob(jobs, candidate);
      seenExternalIds.add(sourceJob.externalId);
      if (!duplicate) {
        jobs.push(candidate);
        newCount += 1;
        continue;
      }
      const sameSource = duplicate.sources.some((source) => source.sourceId === connection.sourceId && source.externalId === sourceJob.externalId);
      jobs = jobs.map((job) => job.jobId === duplicate.jobId ? reconcileFoundJob(job, candidate, receipt) : job);
      if (sameSource) updatedCount += 1;
      else duplicateCount += 1;
    } catch {
      unusableCount += 1;
    }
  }

  const canCloseMissingJobs = !feed.truncated && unusableCount === 0;
  if (canCloseMissingJobs) {
    jobs = jobs.map((job) => {
      const hasThisSource = job.sources.some((source) => source.sourceId === connection.sourceId);
      if (!hasThisSource) return job;
      const sources = job.sources.map((source) => source.sourceId === connection.sourceId && !seenExternalIds.has(source.externalId)
        ? { ...source, active: false }
        : source);
      const hasLiveReceipt = sources.some((source) => source.importMethod === "public_feed");
      const hasActiveLiveReceipt = sources.some((source) => source.importMethod === "public_feed" && source.active);
      const shouldClose = hasLiveReceipt && !hasActiveLiveReceipt && ["found", "review_queue", "saved"].includes(job.status);
      if (shouldClose) closedCount += 1;
      return {
        ...job,
        source: sources.find((source) => source.active) ?? sources[0] ?? job.source,
        sources,
        status: shouldClose ? "closed" : job.status,
        metadata: { ...job.metadata, updatedAt: feed.fetchedAt, lastSeenAt: hasActiveLiveReceipt ? feed.fetchedAt : job.metadata.lastSeenAt }
      };
    });
  }

  const partial = feed.truncated || unusableCount > 0;
  const completedRun: SearchRun = {
    ...running,
    completedAt: feed.fetchedAt,
    status: partial ? "partial" : "success",
    fetchedCount: feed.jobs.length,
    newCount,
    updatedCount,
    duplicateCount,
    unusableCount,
    closedCount,
    errorMessage: feed.truncated
      ? "The board exceeded the 250-role review boundary. Missing roles were not marked closed."
      : unusableCount
        ? `${unusableCount} posting${unusableCount === 1 ? " was" : "s were"} omitted because the source did not provide enough evidence to score safely.`
        : null
  };

  const sources = campaign.sources.some((source) => source.sourceId === connection.sourceId)
    ? campaign.sources.map((source) => source.sourceId === connection.sourceId ? {
      ...source,
      status: partial ? "attention" as const : "ready" as const,
      lastCheckedAt: feed.fetchedAt,
      lastSuccessfulRunAt: feed.fetchedAt,
      lastError: completedRun.errorMessage
    } : source)
    : [{
      ...connection,
      status: partial ? "attention" as const : "ready" as const,
      lastCheckedAt: feed.fetchedAt,
      lastSuccessfulRunAt: feed.fetchedAt,
      lastError: completedRun.errorMessage
    }, ...campaign.sources];

  return {
    ...campaign,
    jobs,
    sources,
    searchRuns: finalizeRun(campaign.searchRuns, completedRun)
  };
}

export function failSourceRun(campaign: CampaignDraft, connection: SourceConnection, running: SearchRun, message: string, completedAt = new Date().toISOString()): CampaignDraft {
  const failedRun: SearchRun = { ...running, completedAt, status: "failed", errorMessage: message };
  return {
    ...campaign,
    sources: campaign.sources.map((source) => source.sourceId === connection.sourceId ? {
      ...source,
      status: "attention",
      lastCheckedAt: completedAt,
      lastError: message
    } : source),
    searchRuns: finalizeRun(campaign.searchRuns, failedRun)
  };
}

export function disconnectSourceConnection(campaign: CampaignDraft, sourceId: string): CampaignDraft {
  return {
    ...campaign,
    sources: campaign.sources.filter((source) => source.sourceId !== sourceId),
    jobs: campaign.jobs.map((job) => {
      if (!job.sources.some((source) => source.sourceId === sourceId)) return job;
      const sources = job.sources.map((source) => source.sourceId === sourceId ? { ...source, active: false } : source);
      return { ...job, source: sources.find((source) => source.active) ?? sources[0] ?? job.source, sources };
    })
  };
}
