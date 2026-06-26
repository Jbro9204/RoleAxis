# Research Sources

Research pass date: 2026-06-26

These sources inform the Phase One application-question rules. They are used to define product behavior, pause rules, intake coverage, and risk categories. This file is not legal advice.

## Official References

- EEOC, Pre-Employment Inquiries and Disability  
  https://www.eeoc.gov/pre-employment-inquiries-and-disability  
  Product impact: disability-related questions and medical exams require strict handling. RoleAxis must not infer disability information from resumes. Accommodation questions must be treated as sensitive and must pause unless the user has explicitly configured a response.

- EEOC, Pre-Employment Inquiries and Race  
  https://www.eeoc.gov/pre-employment-inquiries-and-race  
  Product impact: race-related applicant information, when collected for affirmative action or applicant-flow purposes, must be separated from hiring decisions. RoleAxis treats demographic answers as voluntary, sensitive, and never inferred.

- EEOC, Pre-Employment Inquiries and Citizenship  
  https://www.eeoc.gov/pre-employment-inquiries-and-citizenship  
  Product impact: work eligibility and citizenship-related questions require careful distinction. RoleAxis can ask about work authorization and sponsorship during intake, but must avoid guessing citizenship, document type, or immigration details.

- DOL OFCCP, Voluntary Self-Identification of Disability Form  
  https://www.dol.gov/agencies/ofccp/self-id-forms  
  Product impact: disability self-identification is voluntary and sensitive. RoleAxis must support "do not wish to answer" style responses and must not modify the meaning of official form options.

- DOL OFCCP, Sample VEVRAA Self-Identification Form  
  https://www.dol.gov/agencies/ofccp/vevraa/self-id-form  
  Product impact: protected veteran questions are voluntary and sensitive. RoleAxis must not infer military or veteran status. Reuse requires explicit user preference.

- FTC, Using Consumer Reports: What Employers Need to Know  
  https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-employers-need-know  
  Product impact: background-check and consumer-report authorizations require clear handling. RoleAxis should treat consent, background reports, credit reports, and adverse-action-related questions as high risk.

- EEOC, Enforcement Guidance on Arrest and Conviction Records  
  https://www.eeoc.gov/laws/guidance/enforcement-guidance-consideration-arrest-and-conviction-records-employment-decisions  
  Product impact: criminal-history questions are sensitive and jurisdiction-dependent. RoleAxis should default these to manual review unless the user explicitly configures a reusable answer.

- EEOC, Employment Tests and Selection Procedures  
  https://www.eeoc.gov/laws/guidance/employment-tests-and-selection-procedures  
  Product impact: assessments, tests, and selection procedures must be separated from normal application fields. RoleAxis should identify them as a distinct workflow and avoid fabricating or coaching false answers.

## Research Rules

- Official government and platform documentation takes priority over blog summaries.
- Legal, medical, demographic, military, background, and final-attestation questions must never be inferred.
- If a source changes or a portal adds a new question type, update the question library before automating that answer.
- Product behavior should use conservative defaults until the user explicitly chooses more automation.
- Research findings must become structured rules, not loose notes.

