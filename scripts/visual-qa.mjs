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

const server = spawn(process.execPath, [path.resolve(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
  cwd: root,
  stdio: "ignore"
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
  await page.addScriptTag({ content: axe.source });
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
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(outputDirectory, `${target.name}-launch.png`), fullPage: true });
    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      bodyFont: getComputedStyle(document.body).fontFamily
    }));
    report.push({ ...target, layout, accessibility: await accessibilityAudit(page), consoleErrors });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto(appUrl, { waitUntil: "networkidle" });
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
  await context.close();

  const failures = report.filter((entry) =>
    entry.layout?.horizontalOverflow ||
    entry.consoleErrors?.length ||
    entry.accessibility?.length ||
    entry.storageBoundary?.containsPlaintextName ||
    (entry.storageBoundary && !entry.storageBoundary.hasEncryptedDraft)
  );

  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify(report, null, 2), "utf8");
  if (failures.length) throw new Error(`Visual QA found ${failures.length} failing surface(s). See tmp/visual-qa/report.json.`);
  console.log(`Visual QA passed ${report.length} checks. Report: ${path.relative(root, path.join(outputDirectory, "report.json"))}`);
} finally {
  if (browser) await browser.close();
  server.kill();
}
