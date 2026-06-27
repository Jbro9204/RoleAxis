import axe from "axe-core";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = process.cwd();
const outputDirectory = path.resolve(root, "tmp", "visual-qa");
const appUrl = "http://127.0.0.1:4173";
const sampleResume = `Alex Morgan
alex.morgan@example.com | (919) 555-0138 | https://www.linkedin.com/in/alexmorgan

PROFESSIONAL SUMMARY
Operations leader focused on measurable service and team performance.

SKILLS
Team Leadership, Workforce Planning, Process Improvement, Excel, Performance Coaching

EXPERIENCE
Northstar Services
Senior Operations Manager
January 2021 - Present

EDUCATION
Bachelor of Science, Business Administration
Carolina State University`;
const sampleJob = `Northstar Services is hiring a Senior Operations Manager to lead a growing service operation in Raleigh. This hybrid role owns workforce planning, performance coaching, process improvement, and weekly operating reviews.

Responsibilities
- Lead frontline managers and improve service performance across a multi-site operation
- Build workforce plans and capacity forecasts using Excel
- Establish measurable coaching and process-improvement routines

Requirements
- Bachelor's degree or equivalent verified experience required
- Advanced Excel and workforce planning skills
- 5+ years of operations leadership experience

Preferred Qualifications
- Process improvement certification preferred
- Experience supporting distributed teams

Compensation
$90,000 - $115,000 per year`;
const sourceFeed = {
  source: { identifier: "meridian", boardUrl: "https://jobs.lever.co/meridian" },
  jobs: [{
    externalId: "meridian-operations-1",
    url: "https://jobs.lever.co/meridian/meridian-operations-1",
    title: "Regional Operations Director",
    location: "Raleigh, NC",
    remoteType: "hybrid",
    description: `Meridian Field Systems is hiring a Regional Operations Director to lead workforce planning, service quality, field performance, and manager coaching across a growing operation.

Requirements
- Five years of operations leadership experience required
- Advanced Excel and workforce planning skills
- Bachelor's degree or equivalent experience

Preferred Qualifications
- Process improvement certification preferred`,
    salaryMinimum: 105000,
    salaryMaximum: 130000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    sourceUpdatedAt: null
  }],
  totalAvailable: 1,
  truncated: false,
  fetchedAt: "2026-06-27T12:00:00.000Z"
};

if (!outputDirectory.startsWith(path.resolve(root, "tmp") + path.sep)) {
  throw new Error("Visual QA output must stay inside the repository tmp directory.");
}
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const browserCandidates = [
  process.env.ROLEAXIS_BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);
const executablePath = browserCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error("No supported local Chromium browser was found. Set ROLEAXIS_BROWSER_PATH and run again.");
}

const server = spawn(process.execPath, [path.resolve(root, "server-dist", "index.js")], {
  cwd: root,
  stdio: "ignore",
  env: { ...process.env, PORT: "4173" }
});

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(appUrl);
      if (response.ok) return;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("The visual QA server did not start within 15 seconds.");
}

async function accessibilityAudit(page) {
  const result = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }
  }));
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.slice(0, 8).map((node) => node.target)
  }));
}

async function layoutAudit(page) {
  return page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    bodyFont: getComputedStyle(document.body).fontFamily
  }));
}

async function settleVisual(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.waitForTimeout(300);
}

const report = [];
let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath });

  for (const target of [
    { name: "desktop", viewport: { width: 1600, height: 1000 } },
    { name: "tablet", viewport: { width: 834, height: 1112 } },
    { name: "mobile", viewport: { width: 390, height: 844 } }
  ]) {
    const context = await browser.newContext({ viewport: target.viewport, deviceScaleFactor: 1 });
    await context.addInitScript({ content: axe.source });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(outputDirectory, `${target.name}-launch.png`), fullPage: true });
    const layout = await layoutAudit(page);
    report.push({ ...target, layout, accessibility: await accessibilityAudit(page), consoleErrors });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript({ content: axe.source });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.route("**/api/job-sources?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sourceFeed) });
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "sample-resume.txt", mimeType: "text/plain", buffer: Buffer.from(sampleResume) });
  await page.getByRole("heading", { name: /Nothing becomes a claim/i }).waitFor();

  for (const category of ["Identity", "Contact", "Experience", "Education", "Skills", "Links"]) {
    const categoryButton = page.getByRole("button", { name: new RegExp(`^${category}`) });
    if (await categoryButton.count()) {
      await categoryButton.click();
      const confirmButtons = page.getByRole("button", { name: "Confirm", exact: true });
      while (await confirmButtons.count()) await confirmButtons.first().click();
    }
  }

  await page.getByRole("button", { name: /Continue to preferences/i }).click();
  await page.getByRole("heading", { name: /Set the boundaries once/i }).waitFor();
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outputDirectory, "desktop-intake.png"), fullPage: true });

  const storageBoundary = await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("roleaxis-private-workspace");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const records = await new Promise((resolve, reject) => {
      const request = database.transaction("encrypted-drafts", "readonly").objectStore("encrypted-drafts").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    database.close();
    const draft = records.find((record) => record.id === "campaign-draft");
    return {
      recordIds: records.map((record) => record.id),
      hasEncryptedDraft: draft?.ciphertext instanceof ArrayBuffer,
      containsPlaintextName: JSON.stringify(records).includes("Alex Morgan")
    };
  });

  report.push({
    name: "resume-to-intake",
    accessibility: await accessibilityAudit(page),
    consoleErrors,
    storageBoundary
  });

  for (let step = 0; step < 28; step += 1) {
    if (await page.getByRole("heading", { name: /Your campaign is calibrated/i }).count()) break;
    const questionText = await page.locator(".questionStage h2").textContent();
    const listInput = page.locator(".listInput input");
    const choice = page.locator(".choiceOption").first();
    const multiChoice = page.locator(".multiChoiceField button").first();
    const textInput = page.locator(".textAnswer input");
    if (await listInput.count()) {
      const value = questionText?.includes("job titles") ? "Operations Manager" : questionText?.includes("Where should") ? "Raleigh, NC" : questionText?.includes("licenses") ? "Driver License" : "Greenhouse";
      await listInput.fill(value);
      await page.locator(".listInput button").click();
    } else if (await choice.count()) {
      await choice.click();
    } else if (await multiChoice.count()) {
      await multiChoice.click();
    } else if (await textInput.count()) {
      if (!(await textInput.inputValue())) {
        const value = await textInput.getAttribute("type") === "number" ? "75000" : questionText?.includes("preferred name") ? "Alex" : questionText?.includes("address") ? "Raleigh, NC 27601" : "Confirmed for this test campaign";
        await textInput.fill(value);
      }
    }
    const continueButton = page.getByRole("button", { name: /Save and continue|Finish calibration/i });
    await continueButton.click();
    await page.waitForTimeout(80);
  }

  await page.getByRole("heading", { name: /Your campaign is calibrated/i }).waitFor();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.getByRole("heading", { name: /Build signal you can defend/i }).waitFor();
  await settleVisual(page);
  await page.screenshot({ path: path.join(outputDirectory, "desktop-discovery-empty.png"), fullPage: true });
  report.push({ name: "discovery-empty", layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });

  await page.getByRole("button", { name: /Connect public board/i }).first().click();
  await page.getByRole("heading", { name: /Connect the employer’s careers page/i }).waitFor();
  await page.screenshot({ path: path.join(outputDirectory, "desktop-source-connection.png"), fullPage: true });
  report.push({ name: "source-connection", layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });
  await page.getByLabel("Employer name").fill("Meridian Field Systems");
  await page.getByLabel("Public careers URL").fill("https://jobs.lever.co/meridian");
  await page.getByRole("button", { name: /Connect and check now/i }).click();
  await page.getByText(/Meridian Field Systems is connected/i).waitFor();
  await settleVisual(page);
  await page.screenshot({ path: path.join(outputDirectory, "desktop-live-source-result.png"), fullPage: true });
  report.push({ name: "live-source-result", layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });
  await page.setViewportSize({ width: 390, height: 844 });
  await settleVisual(page);
  await page.screenshot({ path: path.join(outputDirectory, "mobile-live-source-result.png"), fullPage: true });
  report.push({ name: "live-source-result-mobile", viewport: { width: 390, height: 844 }, layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });
  await page.setViewportSize({ width: 1600, height: 1000 });

  await page.getByRole("button", { name: /Import a role/i }).first().click();
  await page.getByRole("heading", { name: /Import the posting as published/i }).waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outputDirectory, "desktop-import-form.png"), fullPage: true });
  report.push({ name: "job-import-dialog", layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });
  await page.getByLabel("Original job URL").fill("https://boards.greenhouse.io/northstar/jobs/12345?utm_source=qa&gh_jid=12345");
  await page.getByLabel("Company").fill("Northstar Services");
  await page.getByLabel("Role title").fill("Senior Operations Manager");
  await page.getByLabel("Listed location").fill("Raleigh, NC");
  await page.getByLabel("Work arrangement").selectOption("hybrid");
  await page.getByLabel("Minimum").fill("90000");
  await page.getByLabel("Maximum").fill("115000");
  await page.getByLabel("Complete job description").fill(sampleJob);
  await page.getByRole("button", { name: /Normalize and score/i }).click();
  await page.getByRole("heading", { name: "Senior Operations Manager" }).waitFor();
  await settleVisual(page);
  await page.screenshot({ path: path.join(outputDirectory, "desktop-discovery-result.png"), fullPage: true });
  report.push({ name: "discovery-result", layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });

  await page.locator(".jobSignalRow").filter({ has: page.getByRole("heading", { name: "Senior Operations Manager" }) }).getByRole("button", { name: /Open dossier/i }).click();
  await page.getByRole("heading", { name: "Senior Operations Manager" }).waitFor();
  await settleVisual(page);
  await page.screenshot({ path: path.join(outputDirectory, "desktop-job-dossier.png"), fullPage: true });
  report.push({ name: "job-dossier-desktop", layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });

  await page.getByRole("button", { name: "Feels right" }).click();
  await page.getByRole("button", { name: "Feels right" }).waitFor();

  await page.getByRole("button", { name: "Skip role" }).click();
  await page.getByRole("heading", { name: /Why are you skipping this role/i }).waitFor();
  await page.screenshot({ path: path.join(outputDirectory, "desktop-skip-dialog.png"), fullPage: true });
  report.push({ name: "skip-reason-dialog", layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });
  await page.keyboard.press("Escape");
  await page.getByRole("heading", { name: /Why are you skipping this role/i }).waitFor({ state: "detached" });

  await page.setViewportSize({ width: 390, height: 844 });
  await settleVisual(page);
  await page.screenshot({ path: path.join(outputDirectory, "mobile-job-dossier.png"), fullPage: true });
  report.push({ name: "job-dossier-mobile", viewport: { width: 390, height: 844 }, layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors });
  await page.setViewportSize({ width: 1600, height: 1000 });

  await page.getByRole("button", { name: /Send to review/i }).click();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByRole("heading", { name: /Decide with the whole record/i }).waitFor();
  await settleVisual(page);
  await page.screenshot({ path: path.join(outputDirectory, "desktop-review-queue.png"), fullPage: true });
  await page.waitForTimeout(450);
  const jobStorageBoundary = await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("roleaxis-private-workspace");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const records = await new Promise((resolve, reject) => {
      const request = database.transaction("encrypted-drafts", "readonly").objectStore("encrypted-drafts").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    database.close();
    const draft = records.find((record) => record.id === "campaign-draft");
    return {
      hasEncryptedDraft: draft?.ciphertext instanceof ArrayBuffer,
      containsPlaintextJob: JSON.stringify(records).includes("Northstar Services"),
      containsPlaintextSource: JSON.stringify(records).includes("Meridian Field Systems")
    };
  });
  report.push({ name: "review-queue", layout: await layoutAudit(page), accessibility: await accessibilityAudit(page), consoleErrors, storageBoundary: jobStorageBoundary });
  await context.close();

  const failures = report.filter((entry) =>
    entry.layout?.horizontalOverflow ||
    entry.consoleErrors?.length ||
    entry.accessibility?.length ||
    entry.storageBoundary?.containsPlaintextName ||
    entry.storageBoundary?.containsPlaintextJob ||
    entry.storageBoundary?.containsPlaintextSource ||
    (entry.storageBoundary && !entry.storageBoundary.hasEncryptedDraft)
  );

  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify(report, null, 2), "utf8");
  if (failures.length) throw new Error(`Visual QA found ${failures.length} failing surface(s). See tmp/visual-qa/report.json.`);
  console.log(`Visual QA passed ${report.length} checks. Report: ${path.relative(root, path.join(outputDirectory, "report.json"))}`);
} finally {
  if (browser) await browser.close();
  server.kill();
}
