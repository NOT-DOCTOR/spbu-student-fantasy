-- PHP migration 001: optional local authentication credentials.
-- Run only after backing up the InfinityFree database.
-- Existing Manus/OAuth users remain valid because password_hash is nullable.
ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255) NULL AFTER email;

CREATE INDEX users_email_idx ON users (email);
