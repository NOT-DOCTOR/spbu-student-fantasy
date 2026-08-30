# Project TODO

- [x] Document the approved SPBU Student Fantasy requirements and implementation assumptions
- [x] Map the existing template structure and reusable components
- [x] Design scalable tables for faculties, programs, cohorts, students, semesters, subjects, offerings, results, attempts, scores, rankings, achievements, AI analyses, imports, errors, privacy, scoring configurations, and audit logs
- [x] Generate and apply the database schema migration safely
- [x] Add server-side STUDENT and ADMIN authorization helpers
- [x] Add privacy visibility and private-mode enforcement to academic data procedures
- [x] Implement grade/status normalization while preserving raw imported values
- [x] Implement deterministic academic scoring with configurable subject weights and optional credit weighting
- [x] Implement explainable fantasy scoring with configurable factors
- [x] Implement configurable deterministic tie-breaking and versioned ranking snapshots
- [x] Implement rule-based achievement evaluation
- [x] Implement CSV/XLSX import parsing and import metadata storage
- [x] Implement import validation for duplicates, unknown records, invalid values, attempts, subjects, semesters, and missing classifications
- [x] Implement import review, confirmation, publishing, and unpublishing workflow
- [x] Implement audit logging for sensitive administrative actions
- [x] Build the premium cyberpunk SPBU-branded landing page
- [ ] Build the authenticated student dashboard with score, rank, movement, trends, form, subjects, achievements, and AI analysis
- [ ] Build permission-aware leaderboards and subject analytics
- [ ] Build student profile views with privacy-aware visibility
- [ ] Build the admin workspace for students, cohorts, subjects, semesters, scoring, publishing, imports, AI analyses, and audit history
- [ ] Implement structured pre-generated AI analysis upload, validation, publishing, replacement, and rendering
- [x] Add responsive mobile, tablet, and desktop layouts
- [x] Add Vitest coverage for normalization, scoring, ranking, privacy, validation, and authorization behavior
- [x] Run type checks, tests, production build, and visual preview verification
- [x] Save the completed first project checkpoint
- [ ] Deliver the project version and implementation summary

## Decisions intentionally kept configurable

- [ ] Exact EXAM versus PASS/FAIL weighting
- [ ] Whether credits affect scoring
- [ ] Fantasy Score formula factors and weights
- [ ] Attempt weighting
- [ ] Tie-breaking policy details
- [ ] Student verification mechanism
- [ ] Privacy visibility policy
- [ ] Final SPBU branding assets and terminology

## Out of scope for the first implementation

- [ ] Payments or premium monetization
- [ ] Live AI generation
- [ ] Public unauthenticated academic data
- [ ] Fabricated student results, reviews, testimonials, or AI analyses
- [ ] Automatic publication of imported academic data
- [ ] Future faculties beyond the configurable data model without source data

## Evidence log

- Requirements source: /home/ubuntu/upload/SPBU_Student_Fantasy_Project_Spec.md
- Concise requirements source: /home/ubuntu/upload/pasted_content.txt
- Project scaffold: /home/ubuntu/spbu-student-fantasy
- Initial checkpoint: a072c91e
- Initial implementation begins after this checklist is recorded.

- [x] Reconcile Drizzle migration state with the live database after the interrupted migration application
- [x] Verify all expected tables, foreign keys, indexes, and migration records match drizzle/schema.ts
- [x] Document a repeatable schema verification step to prevent partial or duplicate migrations
- [x] Implement ranking snapshot generation and persistence using a selected scoring configuration, including publish and lock semantics
- [x] Add tests for ranking snapshot versioning, deterministic ordering, and publication boundaries
- [x] Add an exact schema verification script comparing expected tables, foreign keys, constraints, indexes, and migration hashes with the live database
- [x] Document the migration recovery and validation procedure so the Drizzle ledger remains trustworthy
