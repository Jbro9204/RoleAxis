export type SupportedBoard = {
  adapter: "greenhouse" | "lever";
  identifier: string;
  region: "global" | "eu";
  canonicalBoardUrl: string;
};

export type NormalizedSourceJob = {
  externalId: string;
  url: string;
  title: string;
  location: string;
  remoteType: "remote" | "hybrid" | "onsite" | "unknown";
  description: string;
  salaryMinimum: number | null;
  salaryMaximum: number | null;
  salaryCurrency: string;
  salaryPeriod: "hour" | "year" | "month" | "week" | "unknown";
  sourceUpdatedAt: string | null;
};

const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]{2,80}$/;
const MAX_JOBS = 250;

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”"
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#")) {
      const radix = code[1]?.toLowerCase() === "x" ? 16 : 10;
      const numeric = Number.parseInt(code.slice(radix === 16 ? 2 : 1), radix);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

export function htmlToPlainText(value: string) {
  return decodeEntities(value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/\r/g, "")
    .replace(/[\t\u00a0 ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseSupportedBoardUrl(value: string): SupportedBoard {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a complete HTTPS public careers URL.");
  }
  if (url.protocol !== "https:") throw new Error("Public careers URLs must use HTTPS.");
  const hostname = url.hostname.toLowerCase();
  const identifier = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (!IDENTIFIER_PATTERN.test(identifier)) throw new Error("The careers URL does not contain a valid public board identifier.");

  if (["boards.greenhouse.io", "job-boards.greenhouse.io"].includes(hostname)) {
    return {
      adapter: "greenhouse",
      identifier,
      region: "global",
      canonicalBoardUrl: `https://${hostname}/${identifier}`
    };
  }
  if (["jobs.lever.co", "jobs.eu.lever.co"].includes(hostname)) {
    const region = hostname === "jobs.eu.lever.co" ? "eu" : "global";
    return {
      adapter: "lever",
      identifier,
      region,
      canonicalBoardUrl: `https://${hostname}/${identifier}`
    };
  }
  throw new Error("This public careers board is not supported yet. Use manual import for this source.");
}

function salaryPeriod(value: unknown): NormalizedSourceJob["salaryPeriod"] {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("hour")) return "hour";
  if (normalized.includes("year") || normalized.includes("annual")) return "year";
  if (normalized.includes("month")) return "month";
  if (normalized.includes("week")) return "week";
  return "unknown";
}

function remoteType(value: unknown, location: string, description: string): NormalizedSourceJob["remoteType"] {
  const evidence = `${String(value ?? "")} ${location} ${description.slice(0, 1000)}`;
  if (/\bhybrid\b/i.test(evidence)) return "hybrid";
  if (/\b(remote|work from home|distributed)\b/i.test(evidence)) return "remote";
  if (/\b(on[- ]?site|in[- ]?office)\b/i.test(evidence)) return "onsite";
  return "unknown";
}

type GreenhousePayload = {
  jobs?: Array<{
    id?: number | string;
    title?: string;
    updated_at?: string;
    location?: { name?: string };
    absolute_url?: string;
    content?: string;
  }>;
  meta?: { total?: number };
};

export function normalizeGreenhouse(payload: GreenhousePayload, board: SupportedBoard) {
  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  const normalized = jobs.slice(0, MAX_JOBS).flatMap<NormalizedSourceJob>((job) => {
    const title = String(job.title ?? "").trim();
    const url = String(job.absolute_url ?? "").trim();
    const description = htmlToPlainText(String(job.content ?? ""));
    const location = String(job.location?.name ?? "Location not listed").trim();
    if (!job.id || !title || !url || !description) return [];
    return [{
      externalId: String(job.id),
      url,
      title,
      location,
      remoteType: remoteType(null, location, description),
      description,
      salaryMinimum: null,
      salaryMaximum: null,
      salaryCurrency: "USD",
      salaryPeriod: "unknown",
      sourceUpdatedAt: job.updated_at ?? null
    }];
  });
  return {
    source: { identifier: board.identifier, boardUrl: board.canonicalBoardUrl },
    jobs: normalized,
    totalAvailable: typeof payload.meta?.total === "number" ? payload.meta.total : jobs.length,
    truncated: (payload.meta?.total ?? jobs.length) > MAX_JOBS || normalized.length < Math.min(jobs.length, MAX_JOBS)
  };
}

type LeverPayload = Array<{
  id?: string;
  text?: string;
  categories?: { location?: string; allLocations?: string[] };
  descriptionPlain?: string;
  openingPlain?: string;
  additionalPlain?: string;
  lists?: Array<{ text?: string; content?: string }>;
  hostedUrl?: string;
  workplaceType?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
}>;

export function normalizeLever(payload: LeverPayload, board: SupportedBoard) {
  const jobs = Array.isArray(payload) ? payload : [];
  const normalized = jobs.slice(0, MAX_JOBS).flatMap<NormalizedSourceJob>((job) => {
    const title = String(job.text ?? "").trim();
    const url = String(job.hostedUrl ?? "").trim();
    const listText = (job.lists ?? []).map((list) => `${String(list.text ?? "").trim()}\n${htmlToPlainText(String(list.content ?? ""))}`).join("\n\n");
    const description = [job.descriptionPlain, job.openingPlain, listText, job.additionalPlain].map((item) => String(item ?? "").trim()).filter(Boolean).join("\n\n");
    const location = String(job.categories?.location ?? job.categories?.allLocations?.join(" · ") ?? "Location not listed").trim();
    if (!job.id || !title || !url || !description) return [];
    return [{
      externalId: job.id,
      url,
      title,
      location,
      remoteType: remoteType(job.workplaceType, location, description),
      description,
      salaryMinimum: typeof job.salaryRange?.min === "number" ? job.salaryRange.min : null,
      salaryMaximum: typeof job.salaryRange?.max === "number" ? job.salaryRange.max : null,
      salaryCurrency: job.salaryRange?.currency ?? "USD",
      salaryPeriod: salaryPeriod(job.salaryRange?.interval),
      sourceUpdatedAt: null
    }];
  });
  return {
    source: { identifier: board.identifier, boardUrl: board.canonicalBoardUrl },
    jobs: normalized,
    totalAvailable: jobs.length,
    truncated: jobs.length > MAX_JOBS || normalized.length < Math.min(jobs.length, MAX_JOBS)
  };
}
