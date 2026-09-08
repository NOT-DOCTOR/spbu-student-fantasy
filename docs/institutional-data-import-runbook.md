# Institutional data import runbook

## Scope

SPBU//FANTASY accepts institutional result sources through the protected administrator pipeline. The initial release supports CSV, XLSX, and JSON sources. Source files are retained through S3 metadata references; academic rows are not published automatically.

## Required records before results

Before importing results, an administrator must create or verify the faculty, program, cohort, semester, subjects, and subject offerings. Student records must already exist with stable institutional `studentId` values. The student registry now supports protected search, creation, full field editing, and status changes. Disabled records must not be used for ordinary student access.

## Review sequence

The administrator uploads a source with the target cohort and semester. The system validates identifiers, subject and semester references, grade/status normalization, duplicate rows, attempts, and missing classifications. The administrator resolves visible import errors, confirms the import, reviews the resulting release boundary, and explicitly publishes only after the source is approved. Unpublishing remains an administrator action and is recorded in the audit log.

## Privacy and governance

Use only approved institutional data. Do not upload passwords, OAuth tokens, unrelated personal data, or fabricated sample records. Preview and validation must be performed before publication. Production seed data is intentionally not created by this development task; the next operational action is for an authorized administrator to supply an approved export and confirm its cohort and semester mapping.

## Data handoff checklist

| Item | Required before upload |
|---|---|
| Source format | CSV, XLSX, or JSON |
| Stable student identifier | Matches an existing student record |
| Cohort and semester | Existing records and correct target mapping |
| Subject classification | Existing offering with EXAM or PASS_FAIL classification |
| Approval | Institutional owner confirms the export is authorized |
| Release decision | Administrator reviews errors and explicitly publishes |

## Current boundary

This runbook proves that the application path is ready for real approved data, but it does not contain or seed institutional student/result records. A real export and an authorized release decision are still required.
