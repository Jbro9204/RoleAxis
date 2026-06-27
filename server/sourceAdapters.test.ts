import { describe, expect, it } from "vitest";
import { htmlToPlainText, normalizeGreenhouse, normalizeLever, parseSupportedBoardUrl } from "./sourceAdapters";

describe("public source adapters", () => {
  it("accepts only known HTTPS career-board hosts", () => {
    expect(parseSupportedBoardUrl("https://job-boards.greenhouse.io/northstar/jobs/123")).toMatchObject({ adapter: "greenhouse", identifier: "northstar" });
    expect(parseSupportedBoardUrl("https://jobs.eu.lever.co/northstar/role-id")).toMatchObject({ adapter: "lever", identifier: "northstar", region: "eu" });
    expect(() => parseSupportedBoardUrl("https://example.com/northstar")).toThrow(/not supported/i);
    expect(() => parseSupportedBoardUrl("http://jobs.lever.co/northstar")).toThrow(/HTTPS/i);
  });

  it("converts upstream HTML to inert readable text", () => {
    expect(htmlToPlainText("<p>Lead &amp; coach</p><script>alert('x')</script><ul><li>Excel</li></ul>"))
      .toBe("Lead & coach\n\n• Excel");
  });

  it("normalizes a public board payload without retaining executable markup", () => {
    const board = parseSupportedBoardUrl("https://job-boards.greenhouse.io/northstar");
    const result = normalizeGreenhouse({
      jobs: [{ id: 123, title: "Operations Manager", updated_at: "2026-06-26T12:00:00Z", location: { name: "Raleigh, NC" }, absolute_url: "https://job-boards.greenhouse.io/northstar/jobs/123", content: "<h2>Requirements</h2><p>Lead workforce planning &amp; coaching across the operation.</p>" }],
      meta: { total: 1 }
    }, board);
    expect(result.jobs[0]).toMatchObject({ externalId: "123", title: "Operations Manager", location: "Raleigh, NC" });
    expect(result.jobs[0].description).not.toContain("<p>");
    expect(result.truncated).toBe(false);
  });

  it("preserves Lever salary and work-arrangement evidence", () => {
    const board = parseSupportedBoardUrl("https://jobs.lever.co/northstar");
    const result = normalizeLever([{
      id: "role-1",
      text: "Operations Manager",
      categories: { location: "United States" },
      descriptionPlain: "Lead a national operation with measurable workforce planning, service quality, and coaching responsibilities.",
      hostedUrl: "https://jobs.lever.co/northstar/role-1",
      workplaceType: "remote",
      salaryRange: { min: 90000, max: 115000, currency: "USD", interval: "per-year-salary" }
    }], board);
    expect(result.jobs[0]).toMatchObject({ remoteType: "remote", salaryMinimum: 90000, salaryMaximum: 115000, salaryPeriod: "year" });
  });
});
