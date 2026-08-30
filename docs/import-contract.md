# SPBU Student Fantasy import contract

The import endpoint receives `cohortId` and `semesterId` as trusted administrative metadata. Source rows must identify a student and subject offering; they do not override the selected semester. Validation resolves the subject code only against offerings configured for that cohort and semester. This prevents semester mismatches and rejects subjects that are not classified/configured for the release target.

Source files are parsed server-side, retained in object storage, and represented in the relational database only by import metadata, status, counts, errors, and storage references. A source must pass validation and review before confirmation, and confirmation must occur before publication.
