import { describe, expect, it } from "vitest";
import { extractProfileFacts } from "./resumeReader";

const resumeText = `
Jordan Rivera
jordan.rivera@example.com | (919) 555-0142 | https://linkedin.com/in/jrivera

PROFESSIONAL SUMMARY
Operations leader focused on safe, measurable growth.

SKILLS
Team Leadership, Workforce Planning, Excel, Lean Operations

EXPERIENCE
Northstar Logistics
Senior Operations Manager
January 2021 - Present

EDUCATION
Bachelor of Science, Business Administration
Carolina State University
`;

describe("extractProfileFacts", () => {
  it("extracts only resume-supported identity and contact facts", () => {
    const facts = extractProfileFacts(resumeText);
    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "identity", value: "Jordan Rivera", verified: false }),
        expect.objectContaining({ category: "contact", value: "jordan.rivera@example.com", confidence: "high" }),
        expect.objectContaining({ category: "contact", value: "(919) 555-0142", confidence: "high" }),
        expect.objectContaining({ category: "link", label: "LinkedIn" })
      ])
    );
  });

  it("marks inferred section content for review instead of verification", () => {
    const facts = extractProfileFacts(resumeText);
    expect(facts).toEqual(expect.arrayContaining([expect.objectContaining({ category: "skill", value: "Excel", confidence: "review" })]));
    expect(facts.filter((fact) => ["skill", "experience", "education"].includes(fact.category)).every((fact) => !fact.verified)).toBe(true);
  });
});
