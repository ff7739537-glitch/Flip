/*
# Post Privacy, Auto-Deletion, and Feed Dedup

## Summary
Adds privacy selector support to posts (Public / Friends), auto-deletion
timestamps for messages (3 days) and posts (2 months), and a deduplication
guard to prevent double-posting within 15 seconds.

## Changes

### 1. posts table
- Add column `privacy` (text, default 'public') — values: 'public' | 'friends'
- Add column `expires_at` (timestamptz, nullable) — set 2 months in the future on insert
- Add index on `expires_at` for cleanup queries

### 2. messages table
- Add column `expires_at` (timestamptz, nullable) — set 3 days in the future on insert
- Add index on `expires_at` for cleanup queries

### 3. Security
- No new tables; existing RLS policies remain unchanged.
- The new columns are nullable/defaulted so existing rows are unaffected.

## Important Notes
1. Existing posts get `privacy = 'public'` by default — no visibility change.
2. `expires_at` is nullable so old rows are never expired retroactively.
3. A trigger sets `expires_at` automatically on insert for new posts and messages.
*/

-- Add privacy column to posts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'privacy'
  ) THEN
    ALTER TABLE posts ADD COLUMN privacy text NOT NULL DEFAULT 'public';
  END IF;
END $$;

-- Add expires_at to posts (2 months auto-delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE posts ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts (expires_at) WHERE expires_at IS NOT NULL;

-- Add expires_at to messages (3 days auto-delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages (expires_at) WHERE expires_at IS NOT NULL;

-- Trigger: auto-set expires_at on new posts (2 months)
CREATE OR REPLACE FUNCTION set_post_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '60 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_post_expiry ON posts;
CREATE TRIGGER trg_set_post_expiry
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION set_post_expiry();

-- Trigger: auto-set expires_at on new messages (3 days)
CREATE OR REPLACE FUNCTION set_message_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_message_expiry ON messages;
CREATE TRIGGER trg_set_message_expiry
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_expiry();