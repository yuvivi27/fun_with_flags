-- Add username to canonical users table for profile identity.
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Keep username globally unique when present.
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
