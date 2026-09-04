# First-release scope guard

The first implementation is configured for the SPBU General Medicine cohort and its six-semester academic source data. The relational model supports future faculties, programs, cohorts, and semesters, but no source rows for an unsupported faculty are included or accepted as part of the first release contract. Imports must target an existing configured cohort and semester; subject classification is inherited from configured offerings rather than arbitrary row-level overrides.

Adding another faculty requires an explicit administrator configuration step, approved subject offerings, a target cohort, and a reviewed import. It is not activated merely because the schema can represent it. This keeps the initial release auditable and prevents accidental publication of unsupported faculty data.
