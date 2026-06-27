import type {
  CampaignDraft,
  JobImportInput,
  JobMatch,
  JobOutcome,
  JobRecord,
  JobRemoteType,
  JobSalary,
  MatchDimension
} from "../types";

const TRACKING_PARAMETERS = new Set([
  "ref",
  "referrer",
  "source",
  "src",
  "trk",
  "trackingid",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid"
]);

const PORTALS: Array<{ pattern: RegExp; name: string; type: string }> = [
  { pattern: /greenhouse\.io$/i, name: "Greenhouse", type: "greenhouse" },
  { pattern: /lever\.co$/i, name: "Lever", type: "lever" },
  { pattern: /myworkdayjobs\.com$/i, name: "Workday", type: "workday" },
  { pattern: /smartrecruiters\.com$/i, name: "SmartRecruiters", type: "smartrecruiters" },
  { pattern: /icims\.com$/i, name: "iCIMS", type: "icims" },
  { pattern: /linkedin\.com$/i, name: "LinkedIn", type: "linkedin" },
  { pattern: /indeed\.com$/i, name: "Indeed", type: "indeed" },
  { pattern: /ziprecruiter\.com$/i, name: "ZipRecruiter", type: "ziprecruiter" }
];

const STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "because", "been", "being", "but", "can", "company", "for", "from",
  "have", "into", "job", "more", "our", "role", "that", "the", "their", "this", "through", "with", "will", "work",
  "working", "you", "your", "years", "experience", "required", "preferred", "skills", "team"
]);

const CRITICAL_REQUIREMENT = /\b(bachelor|master|associate|degree|license|licensed|certification|certified|clearance|authorization|authorized|sponsorship|(?:\d+\+?|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?)\b/i;

export class JobImportError extends Error {
  fieldErrors: Partial<Record<keyof JobImportInput, string>>;

  constructor(fieldErrors: Partial<Record<keyof JobImportInput, string>>) {
    super("Review the highlighted job details before importing.");
    this.name = "JobImportError";
    this.fieldErrors = fieldErrors;
  }
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u0000/g, "").replace(/[\t\u00a0]+/g, " ").replace(/[ ]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function comparisonText(value: string) {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function titleTokens(value: string) {
  return comparisonText(value).split(" ").filter((token) => token.length > 1 && !["senior", "junior", "lead", "the", "and"].includes(token));
}

function similarity(left: string, right: string) {
  const leftTokens = new Set(titleTokens(left));
  const rightTokens = new Set(titleTokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export function canonicalizeJobUrl(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an HTTP or HTTPS job link.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  url.searchParams.sort();
  return url.toString();
}

function sourceFromUrl(urlValue: string, company: string, now: string) {
  const url = new URL(urlValue);
  const portal = PORTALS.find((candidate) => candidate.pattern.test(url.hostname));
  const externalId = url.searchParams.get("gh_jid") ?? url.searchParams.get("jobId") ?? url.searchParams.get("job_id") ?? url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return {
    sourceId: null,
    name: `${company} careers`,
    url: urlValue,
    externalId,
    portalType: portal?.type ?? "unclassified_web",
    importMethod: "manual" as const,
    retrievedAt: now,
    lastSeenAt: now,
    active: true
  };
}

function inferRemoteType(location: string, description: string, selected: JobRemoteType): JobRemoteType {
  if (selected !== "unknown") return selected;
  const evidence = `${location} ${description.slice(0, 1200)}`;
  if (/\bhybrid\b/i.test(evidence)) return "hybrid";
  if (/\b(remote|work from home|distributed)\b/i.test(evidence)) return "remote";
  if (/\b(on[- ]?site|in[- ]?office)\b/i.test(evidence)) return "onsite";
  return "unknown";
}

function parseSalaryText(description: string) {
  const match = description.match(/\$\s?([\d]{2,3}(?:,[\d]{3})?|[\d]{2,3}(?:\.\d{1,2})?)\s*(?:-|–|—|to)\s*\$?\s?([\d]{2,3}(?:,[\d]{3})?|[\d]{2,3}(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const minimum = Number(match[1].replace(/,/g, ""));
  const maximum = Number(match[2].replace(/,/g, ""));
  const context = description.slice(Math.max(0, (match.index ?? 0) - 40), (match.index ?? 0) + match[0].length + 45);
  const period: JobSalary["period"] = /\b(hour|hourly|hr)\b/i.test(context) ? "hour" : /\bmonth\b/i.test(context) ? "month" : /\bweek\b/i.test(context) ? "week" : "year";
  return { minimum, maximum, period, rawText: match[0] };
}

function normalizeSalary(input: JobImportInput, description: string): JobSalary {
  const parsed = parseSalaryText(description);
  const minimum = input.salaryMinimum ?? parsed?.minimum ?? null;
  const maximum = input.salaryMaximum ?? parsed?.maximum ?? null;
  const period = input.salaryPeriod !== "unknown" ? input.salaryPeriod : parsed?.period ?? "unknown";
  const currency = /^[A-Z]{3}$/.test(input.salaryCurrency) ? input.salaryCurrency : "USD";
  const format = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  const rawText = minimum !== null
    ? `${format(minimum)}${maximum !== null ? ` – ${format(maximum)}` : ""} ${period}`
    : parsed?.rawText ?? "";
  return { minimum, maximum, currency, period, rawText };
}

function extractQualificationSections(description: string) {
  const lines = description.split(/\n+/).map((line) => line.replace(/^[•●▪◦*-]\s*/, "").trim()).filter(Boolean);
  const requirements: string[] = [];
  const preferredQualifications: string[] = [];
  let section: "requirements" | "preferred" | null = null;

  for (const line of lines) {
    if (/^(requirements|required qualifications|minimum qualifications|what you bring|what you will bring)\s*:?[\s]*$/i.test(line)) {
      section = "requirements";
      continue;
    }
    if (/^(preferred qualifications|nice to have|preferred skills)\s*:?[\s]*$/i.test(line)) {
      section = "preferred";
      continue;
    }
    if (/^(responsibilities|what you will do|benefits|about us|compensation)\s*:?[\s]*$/i.test(line)) {
      section = null;
      continue;
    }
    if (line.length > 220) continue;
    if (section === "requirements") requirements.push(line);
    else if (section === "preferred") preferredQualifications.push(line);
    else if (/\b(required|must have|minimum of|you have|must be|must possess)\b/i.test(line)) requirements.push(line);
    else if (/\b(preferred|nice to have|a plus)\b/i.test(line)) preferredQualifications.push(line);
  }

  return {
    requirements: [...new Set(requirements)].slice(0, 18),
    preferredQualifications: [...new Set(preferredQualifications)].slice(0, 12)
  };
}

function extractKeywords(description: string) {
  const counts = new Map<string, number>();
  for (const token of comparisonText(description).split(" ")) {
    if (token.length < 4 || STOP_WORDS.has(token) || /^\d+$/.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 16)
    .map(([keyword]) => keyword);
}

function annualSalary(value: number, period: JobSalary["period"]) {
  if (period === "hour") return value * 2080;
  if (period === "week") return value * 52;
  if (period === "month") return value * 12;
  return value;
}

function answerValue(campaign: CampaignDraft, key: string) {
  return campaign.answers[key]?.value;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function evaluateRequirements(jobRequirements: string[], profileEvidence: string, campaign: CampaignDraft) {
  const critical = jobRequirements.filter((requirement) => CRITICAL_REQUIREMENT.test(requirement));
  if (!critical.length) return { score: 15, supported: [] as string[], concerns: [] as string[], summary: "No critical credential gate was detected." };

  const supported: string[] = [];
  const concerns: string[] = [];
  for (const requirement of critical) {
    const normalized = comparisonText(requirement);
    const yearRequirement = normalized.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\+?\s+years?/);
    let evidenceMatches = false;
    if (yearRequirement) {
      const years = yearRequirement[1];
      evidenceMatches = new RegExp(`\\b${years}\\+?\\s+years?\\b`).test(profileEvidence);
    } else if (/\bbachelor/.test(normalized)) {
      evidenceMatches = /\bbachelor/.test(profileEvidence);
    } else if (/\bmaster/.test(normalized)) {
      evidenceMatches = /\bmaster/.test(profileEvidence);
    } else if (/\bassociate/.test(normalized)) {
      evidenceMatches = /\bassociate/.test(profileEvidence);
    } else if (/\bdegree/.test(normalized)) {
      evidenceMatches = /\b(bachelor|master|associate|doctorate|degree)\b/.test(profileEvidence);
    } else if (/\b(authorization|authorized)\b/.test(normalized)) {
      evidenceMatches = answerValue(campaign, "work_authorization.us_authorized") === true;
    } else if (/\bsponsorship\b/.test(normalized)) {
      evidenceMatches = answerValue(campaign, "sponsorship.requires_now_or_future") !== undefined;
    } else if (/\b(clearance|license|licensed|certification|certified)\b/.test(normalized)) {
      const specificTokens = titleTokens(requirement).filter((token) => token.length > 3 && !["must", "have", "required", "license", "licensed", "certification", "certified", "clearance"].includes(token));
      evidenceMatches = specificTokens.length > 0 && specificTokens.every((token) => profileEvidence.includes(token));
    }
    if (evidenceMatches) supported.push(requirement);
    else concerns.push(`Confirm requirement: ${requirement}`);
  }
  const score = Math.round((supported.length / critical.length) * 15);
  return {
    score,
    supported,
    concerns,
    summary: concerns.length ? `${concerns.length} critical requirement${concerns.length === 1 ? "" : "s"} need confirmation.` : "Detected credential requirements have supporting profile evidence."
  };
}

export function scoreJobMatch(job: Omit<JobRecord, "match" | "outcome">, campaign: CampaignDraft): { match: JobMatch; outcome: JobOutcome } {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const breakdown: MatchDimension[] = [];
  const targetTitles = stringList(answerValue(campaign, "search.target_titles"));
  const titleSimilarity = targetTitles.length ? Math.max(...targetTitles.map((target) => similarity(job.title, target))) : 0;
  const titleScore = targetTitles.some((target) => comparisonText(job.title).includes(comparisonText(target)) || comparisonText(target).includes(comparisonText(job.title)))
    ? 30
    : Math.round(titleSimilarity * 30);
  if (titleScore >= 20) strengths.push(`Title aligns with ${targetTitles.sort((left, right) => similarity(job.title, right) - similarity(job.title, left))[0]}.`);
  else concerns.push("The role title is outside the strongest configured target match.");
  breakdown.push({ key: "title", label: "Role alignment", score: titleScore, maximum: 30, summary: titleScore >= 20 ? "The title shares strong target-role language." : "Title alignment needs review." });

  const verifiedSkills = (campaign.resume?.facts ?? []).filter((fact) => fact.included && fact.verified && fact.category === "skill").map((fact) => fact.value);
  const jobText = comparisonText(`${job.title} ${job.description} ${job.requirements.join(" ")}`);
  const matchedSkills = verifiedSkills.filter((skill) => jobText.includes(comparisonText(skill)));
  const skillDenominator = Math.max(1, Math.min(5, verifiedSkills.length));
  const skillScore = Math.min(25, Math.round((matchedSkills.length / skillDenominator) * 25));
  if (matchedSkills.length) strengths.push(`Verified skill overlap: ${matchedSkills.slice(0, 4).join(", ")}.`);
  else concerns.push("No direct verified-skill phrase overlap was found.");
  breakdown.push({ key: "skills", label: "Verified skills", score: skillScore, maximum: 25, summary: matchedSkills.length ? `${matchedSkills.length} verified skill${matchedSkills.length === 1 ? "" : "s"} appear in the posting.` : "No verified skill phrase appears directly in the posting." });

  const remotePreference = String(answerValue(campaign, "search.remote_preference") ?? "any");
  const targetLocations = stringList(answerValue(campaign, "search.locations"));
  const locationMatches = targetLocations.some((location) => comparisonText(job.location).includes(comparisonText(location)) || comparisonText(location).includes(comparisonText(job.location)));
  let locationScore = 7;
  let locationSummary = "Location requires review.";
  if (remotePreference === "any") {
    locationScore = 15;
    locationSummary = "Any work arrangement is allowed by campaign rules.";
  } else if (job.remoteType === remotePreference || (remotePreference === "remote" && job.remoteType === "remote")) {
    locationScore = 15;
    locationSummary = `${job.remoteType} matches the configured work arrangement.`;
  } else if (locationMatches && job.remoteType !== "remote") {
    locationScore = 13;
    locationSummary = "The job location matches a configured search location.";
  } else if (job.remoteType === "unknown") {
    concerns.push("The work arrangement is not explicit in the posting.");
  } else {
    locationScore = 2;
    concerns.push(`The ${job.remoteType} arrangement does not match the ${remotePreference} preference.`);
  }
  if (locationScore >= 13) strengths.push(locationSummary);
  breakdown.push({ key: "location", label: "Location & format", score: locationScore, maximum: 15, summary: locationSummary });

  const minimumCompensation = Number(answerValue(campaign, "search.minimum_compensation") ?? 0);
  let compensationScore = 15;
  let compensationSummary = "No minimum compensation gate is configured.";
  if (minimumCompensation > 0) {
    if (job.salary.minimum === null && job.salary.maximum === null) {
      compensationScore = 7;
      compensationSummary = "The posting does not disclose compensation.";
      concerns.push("Compensation is undisclosed and must be confirmed.");
    } else {
      const annualMinimum = job.salary.minimum === null ? null : annualSalary(job.salary.minimum, job.salary.period);
      const annualMaximum = job.salary.maximum === null ? annualMinimum : annualSalary(job.salary.maximum, job.salary.period);
      if ((annualMinimum ?? 0) >= minimumCompensation) {
        compensationSummary = "The disclosed minimum meets the private compensation floor.";
        strengths.push(compensationSummary);
      } else if ((annualMaximum ?? 0) >= minimumCompensation) {
        compensationScore = 10;
        compensationSummary = "Only the upper portion of the disclosed range meets the private floor.";
        concerns.push(compensationSummary);
      } else {
        compensationScore = 0;
        compensationSummary = "The disclosed range is below the private compensation floor.";
        concerns.push(compensationSummary);
      }
    }
  }
  breakdown.push({ key: "compensation", label: "Compensation", score: compensationScore, maximum: 15, summary: compensationSummary });

  const profileEvidence = comparisonText((campaign.resume?.facts ?? []).filter((fact) => fact.included && fact.verified).map((fact) => fact.value).join(" "));
  const requirementResult = evaluateRequirements(job.requirements, profileEvidence, campaign);
  concerns.push(...requirementResult.concerns);
  if (requirementResult.supported.length) strengths.push(`${requirementResult.supported.length} critical requirement${requirementResult.supported.length === 1 ? " has" : "s have"} supporting profile evidence.`);
  breakdown.push({ key: "requirements", label: "Required evidence", score: requirementResult.score, maximum: 15, summary: requirementResult.summary });

  const score = breakdown.reduce((total, dimension) => total + dimension.score, 0);
  const minimumScore = campaign.matchThreshold;
  const hardMismatch = compensationScore === 0 || locationScore <= 2;
  const outcome: JobOutcome = hardMismatch ? "save_for_later" : score >= minimumScore ? "prepare_for_review" : score >= 55 ? "ask_user" : "save_for_later";
  const summary = score >= 80
    ? "Strong alignment with the configured campaign, with remaining concerns clearly identified."
    : score >= 65
      ? "Promising alignment, but one or more campaign gates need review."
      : score >= 45
        ? "Partial alignment. Review the gaps before investing application effort."
        : "The current evidence does not support a strong campaign match.";

  return { match: { score, summary, strengths, concerns: [...new Set(concerns)], breakdown }, outcome };
}

export function validateJobImport(input: JobImportInput) {
  const errors: Partial<Record<keyof JobImportInput, string>> = {};
  if (!input.company.trim()) errors.company = "Enter the company named in the posting.";
  if (!input.title.trim()) errors.title = "Enter the exact role title.";
  if (!input.location.trim()) errors.location = "Enter the listed location or Remote.";
  if (normalizeWhitespace(input.description).length < 120) errors.description = "Paste the complete posting so matching has enough evidence.";
  try {
    canonicalizeJobUrl(input.url);
  } catch {
    errors.url = "Enter a valid HTTP or HTTPS job-posting link.";
  }
  if (input.salaryMinimum !== null && input.salaryMinimum < 0) errors.salaryMinimum = "Salary cannot be negative.";
  if (input.salaryMaximum !== null && input.salaryMinimum !== null && input.salaryMaximum < input.salaryMinimum) errors.salaryMaximum = "Maximum salary must be at least the minimum.";
  if (!/^[A-Z]{3}$/.test(input.salaryCurrency)) errors.salaryCurrency = "Use a three-letter currency code.";
  if (Object.keys(errors).length) throw new JobImportError(errors);
}

export function createJobRecord(
  input: JobImportInput,
  campaign: CampaignDraft,
  options: { source?: JobRecord["source"]; sourceUpdatedAt?: string | null; now?: string } = {}
): JobRecord {
  validateJobImport(input);
  const now = options.now ?? new Date().toISOString();
  const canonicalUrl = canonicalizeJobUrl(input.url);
  const description = normalizeWhitespace(input.description);
  const company = normalizeWhitespace(input.company);
  const title = normalizeWhitespace(input.title);
  const location = normalizeWhitespace(input.location);
  const fingerprint = hash(`${comparisonText(company)}|${comparisonText(title)}|${comparisonText(location)}|${canonicalUrl}`);
  const qualifications = extractQualificationSections(description);
  const source = options.source ?? sourceFromUrl(canonicalUrl, company, now);
  const base = {
    schemaVersion: "1.1.0" as const,
    jobId: `job_${fingerprint}`,
    fingerprint,
    source,
    sources: [source],
    company,
    title,
    location,
    remoteType: inferRemoteType(location, description, input.remoteType),
    salary: normalizeSalary(input, description),
    description,
    requirements: qualifications.requirements,
    preferredQualifications: qualifications.preferredQualifications,
    keywords: extractKeywords(description),
    status: "found" as const,
    review: { decisionReason: null, decidedAt: null },
    matchFeedback: null,
    metadata: { discoveredAt: now, updatedAt: now, expiresAt: null, lastSeenAt: now, sourceUpdatedAt: options.sourceUpdatedAt ?? null }
  };
  const scored = scoreJobMatch(base, campaign);
  return { ...base, ...scored };
}

export function findDuplicateJob(jobs: JobRecord[], candidate: JobRecord) {
  return jobs.find((job) => job.source.url === candidate.source.url || job.fingerprint === candidate.fingerprint || (
    comparisonText(job.company) === comparisonText(candidate.company) &&
    comparisonText(job.title) === comparisonText(candidate.title) &&
    comparisonText(job.location) === comparisonText(candidate.location)
  ));
}
