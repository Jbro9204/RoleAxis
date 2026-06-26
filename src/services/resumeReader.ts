import type { FactCategory, FactConfidence, ProfileFact, ResumeReadResult } from "../types";

const MAX_RESUME_BYTES = 12 * 1024 * 1024;
const SECTION_HEADINGS = /^(summary|profile|professional summary|experience|work experience|employment|education|skills|technical skills|core competencies|certifications?|licenses?|projects?|accomplishments?)\s*:?[\s]*$/i;
const SKILL_HEADINGS = /^(skills|technical skills|core competencies|areas of expertise)\s*:?[\s]*$/i;
const STOP_HEADINGS = /^(experience|work experience|employment|education|certifications?|licenses?|projects?|accomplishments?|references?)\s*:?[\s]*$/i;
const DATE_RANGE = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2})[\s./-]+(?:19|20)?\d{2}\s*(?:-|–|—|to)\s*(?:present|current|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2})?[\s./-]*(?:19|20)?\d{2})\b/i;
const DEGREE_PATTERN = /\b(associate(?:'s)?|bachelor(?:'s)?|master(?:'s)?|doctorate|ph\.?d\.?|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|mba|ged|high school diploma)\b/i;

export class ResumeReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeReadError";
  }
}

function normalizeResumeText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readPdf(file: File): Promise<ResumeReadResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let startNewLine = false;
    const parts: string[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = item.transform[5];
      const movedToNewLine = lastY !== null && Math.abs(y - lastY) > 2;
      if (parts.length && (startNewLine || movedToNewLine)) parts.push("\n");
      else if (parts.length) parts.push(" ");
      parts.push(item.str.trim());
      startNewLine = item.hasEOL;
      lastY = y;
    }
    const text = parts.join("");
    pages.push(text);
  }

  return {
    text: normalizeResumeText(pages.join("\n")),
    pageCount: pdf.numPages,
    fileType: "PDF"
  };
}

async function readDocx(file: File): Promise<ResumeReadResult> {
  const { strFromU8, unzipSync } = await import("fflate");
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const documentParts = Object.keys(archive)
    .filter((path) => /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i.test(path))
    .sort((left, right) => (left === "word/document.xml" ? -1 : right === "word/document.xml" ? 1 : left.localeCompare(right)));

  if (documentParts.length === 0) throw new ResumeReadError("This Word document does not contain readable resume text.");

  const parser = new DOMParser();
  const paragraphs = documentParts.flatMap((path) => {
    const document = parser.parseFromString(strFromU8(archive[path]), "application/xml");
    if (document.querySelector("parsererror")) return [];
    return Array.from(document.getElementsByTagNameNS("*", "p"))
      .map((paragraph) => Array.from(paragraph.getElementsByTagNameNS("*", "t")).map((node) => node.textContent ?? "").join(" ").trim())
      .filter(Boolean);
  });

  return { text: normalizeResumeText(paragraphs.join("\n")), fileType: "Word document" };
}

export async function readResume(file: File): Promise<ResumeReadResult> {
  if (file.size > MAX_RESUME_BYTES) {
    throw new ResumeReadError("Choose a resume smaller than 12 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  try {
    if (extension === "pdf" || file.type === "application/pdf") {
      return await readPdf(file);
    }
    if (
      extension === "docx" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return await readDocx(file);
    }
    if (["txt", "md"].includes(extension ?? "") || file.type.startsWith("text/")) {
      return { text: normalizeResumeText(await file.text()), fileType: "Text document" };
    }
  } catch (error) {
    if (error instanceof ResumeReadError) throw error;
    throw new ResumeReadError("We could not read this file reliably. Export a fresh PDF or DOCX and try again.");
  }

  throw new ResumeReadError("Use a PDF, DOCX, TXT, or Markdown resume.");
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function makeFact(
  facts: ProfileFact[],
  category: FactCategory,
  label: string,
  value: string,
  confidence: FactConfidence
) {
  const normalized = value.trim();
  if (!normalized || facts.some((fact) => fact.category === category && fact.value.toLowerCase() === normalized.toLowerCase())) {
    return;
  }
  facts.push({
    id: `${category}-${facts.length + 1}`,
    category,
    label,
    value: normalized,
    confidence,
    included: true,
    verified: false
  });
}

function findName(lines: string[]) {
  return lines.slice(0, 8).find((line) => {
    const words = line.split(/\s+/);
    return (
      words.length >= 2 &&
      words.length <= 5 &&
      line.length <= 70 &&
      /^[\p{L}.'’-]+(?:\s+[\p{L}.'’-]+)+$/u.test(line) &&
      !SECTION_HEADINGS.test(line)
    );
  });
}

function collectSection(lines: string[], headingPattern: RegExp) {
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start < 0) return [];
  const values: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (STOP_HEADINGS.test(line) || (SECTION_HEADINGS.test(line) && !headingPattern.test(line))) break;
    values.push(line);
    if (values.length >= 10) break;
  }
  return values;
}

export function extractProfileFacts(text: string): ProfileFact[] {
  const normalized = normalizeResumeText(text);
  const lines = normalized.split("\n").map((line) => line.replace(/^[•●▪◦*-]\s*/, "").trim()).filter(Boolean);
  const facts: ProfileFact[] = [];

  const name = findName(lines);
  if (name) makeFact(facts, "identity", "Name", name, "medium");

  for (const email of unique(normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])) {
    makeFact(facts, "contact", "Email", email, "high");
  }

  const phoneMatches = normalized.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) ?? [];
  for (const phone of unique(phoneMatches)) makeFact(facts, "contact", "Phone", phone, "high");

  const urlMatches = normalized.match(/(?:https?:\/\/|www\.)[^\s,)]+/gi) ?? [];
  for (const url of unique(urlMatches)) {
    const label = /linkedin/i.test(url) ? "LinkedIn" : /github/i.test(url) ? "GitHub" : "Professional link";
    makeFact(facts, "link", label, url.replace(/[.;]+$/, ""), "high");
  }

  const skillLines = collectSection(lines, SKILL_HEADINGS);
  const skills = skillLines
    .flatMap((line) => line.split(/[,|;•●▪◦]/))
    .map((skill) => skill.trim())
    .filter((skill) => skill.length >= 2 && skill.length <= 48 && !DATE_RANGE.test(skill));
  for (const skill of unique(skills).slice(0, 24)) makeFact(facts, "skill", "Skill", skill, "review");

  for (let index = 0; index < lines.length; index += 1) {
    if (DATE_RANGE.test(lines[index])) {
      const context = unique([lines[index - 2] ?? "", lines[index - 1] ?? "", lines[index]]).join(" · ");
      makeFact(facts, "experience", "Experience entry", context, "review");
    }
    if (DEGREE_PATTERN.test(lines[index])) {
      const context = unique([lines[index], lines[index + 1] ?? ""]).join(" · ");
      makeFact(facts, "education", "Education", context, "review");
    }
    if (/\b(certified|certification|license|licensed)\b/i.test(lines[index]) && lines[index].length <= 120) {
      makeFact(facts, "certification", "Credential", lines[index], "review");
    }
  }

  return facts;
}
