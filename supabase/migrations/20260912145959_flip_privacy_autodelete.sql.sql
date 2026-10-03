-- Post Privacy, Auto-Deletion, and Feed Dedup
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'privacy') THEN
    ALTER TABLE posts ADD COLUMN privacy text NOT NULL DEFAULT 'public';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'expires_at') THEN
    ALTER TABLE posts ADD COLUMN expires_at timestamptz;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts (expires_at) WHERE expires_at IS NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'expires_at') THEN
    ALTER TABLE messages ADD COLUMN expires_at timestamptz;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages (expires_at) WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION set_post_expiry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '60 days';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_post_expiry ON posts;
CREATE TRIGGER trg_set_post_expiry BEFORE INSERT ON posts FOR EACH ROW EXECUTE FUNCTION set_post_expiry();

CREATE OR REPLACE FUNCTION set_message_expiry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_message_expiry ON messages;
CREATE TRIGGER trg_set_message_expiry BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION set_message_expiry();