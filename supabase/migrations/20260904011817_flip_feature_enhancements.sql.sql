CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_story_views" ON story_views;
CREATE POLICY "select_story_views" ON story_views FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_story_view" ON story_views;
CREATE POLICY "insert_own_story_view" ON story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);
DROP POLICY IF EXISTS "delete_own_story_view" ON story_views;
CREATE POLICY "delete_own_story_view" ON story_views FOR DELETE TO authenticated USING (auth.uid() = viewer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_views_unique ON story_views(story_id, viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);

CREATE TABLE IF NOT EXISTS hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE NOT NULL,
  usage_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_hashtags" ON hashtags;
CREATE POLICY "select_hashtags" ON hashtags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_hashtags" ON hashtags;
CREATE POLICY "insert_hashtags" ON hashtags FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_hashtags" ON hashtags;
CREATE POLICY "update_hashtags" ON hashtags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS post_hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_post_hashtags" ON post_hashtags;
CREATE POLICY "select_post_hashtags" ON post_hashtags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_post_hashtag" ON post_hashtags;
CREATE POLICY "insert_own_post_hashtag" ON post_hashtags FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_post_hashtag" ON post_hashtags;
CREATE POLICY "delete_own_post_hashtag" ON post_hashtags FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags(hashtag_id);

CREATE TABLE IF NOT EXISTS post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sharer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL DEFAULT 'post',
  target_id uuid NOT NULL,
  share_url text,
  platform text DEFAULT 'internal',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_shares" ON post_shares;
CREATE POLICY "select_own_shares" ON post_shares FOR SELECT TO authenticated USING (auth.uid() = sharer_id);
DROP POLICY IF EXISTS "insert_own_share" ON post_shares;
CREATE POLICY "insert_own_share" ON post_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = sharer_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_target ON post_shares(target_type, target_id);

CREATE TABLE IF NOT EXISTS typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_typing_status" ON typing_status;
CREATE POLICY "select_typing_status" ON typing_status FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_typing" ON typing_status;
CREATE POLICY "insert_own_typing" ON typing_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_typing" ON typing_status;
CREATE POLICY "update_own_typing" ON typing_status FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_typing" ON typing_status;
CREATE POLICY "delete_own_typing" ON typing_status FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_typing_conv_user ON typing_status(conversation_id, user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'followers_count') THEN
    ALTER TABLE profiles ADD COLUMN followers_count integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
    ALTER TABLE profiles ADD COLUMN following_count integer DEFAULT 0;
  END IF;
END $$;

INSERT INTO system_settings (key, value)
VALUES ('rate_limit_enabled', 'true')
ON CONFLICT (key) DO NOTHING;