# SPBU//FANTASY PHP API foundation

This directory is the first migration step for InfinityFree-compatible hosting. It is intentionally separate from the existing Node/Express server.

## Current endpoints

- `GET /api/php/health` — confirms PHP routing without touching the database.
- `GET /api/php/auth/me` — returns the current PHP session user or `null`.
- `POST /api/php/auth/login` — local email/password login after the database migration is applied.
- `POST /api/php/auth/logout` — destroys the PHP session.

## Setup

1. Copy `config.example.php` to `config.php` on the server only.
2. Fill in the InfinityFree MySQL host, database name, username, and password.
3. Keep `config.php` out of Git and never paste credentials into source files.
4. Back up the database before applying `migrations/001_add_local_auth.sql`.
5. Use `password_hash()` / `password_verify()` for local credentials.

This is scaffolding only. The complete student, ranking, privacy, admin, import, and OAuth API has not been migrated yet. The Node application remains the reference implementation until each PHP feature has parity tests.
