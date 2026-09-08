# Student record lifecycle policy

Student records are never hard-deleted from the academic platform. Historical results, rankings, audit events, privacy settings, and account links require stable student identifiers and referential continuity.

| Status | Meaning | Student access |
|---|---|---|
| `active` | Current institutional record eligible for verified student access and ordinary published analytics | Allowed when the account link is verified |
| `disabled` | Administrative hold, correction, withdrawal, or access suspension | Blocked by the verified-student gate |
| `graduated` | Institutional record retained after completion of the program | Treated as non-current for ordinary student access unless a future alumni policy explicitly permits it |

Administrators may edit identity and academic placement fields, or transition the status through the protected registry. Each mutation records the previous and new values in the audit log. The import pipeline must not recreate a new record when a stable `studentId` already exists; corrections should use the existing record and remain traceable.
