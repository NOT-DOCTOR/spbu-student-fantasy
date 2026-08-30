# Migration recovery and validation

When an additive Drizzle migration is interrupted, first inspect the live table inventory, foreign keys, indexes, and the `__drizzle_migrations` ledger. Do not rerun the complete migration blindly: identify which statements already succeeded, apply only the missing statements through the managed SQL workflow, and verify the final schema against `drizzle/schema.ts`.

For this project, each migration file is compared with its SHA-256 hash, and the corresponding journal timestamp and hash are recorded exactly once in `__drizzle_migrations`. Run `node scripts/verify-schema.mjs` after a recovery. A successful report must show all expected application tables, the rankings lock column, and matching applied and expected migration counts.
