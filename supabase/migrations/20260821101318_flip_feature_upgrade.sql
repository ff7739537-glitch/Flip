-- FLIP Feature Upgrade Migration
-- Adds: story chapters, blocked users, bug reports, cover photos, ad types, read receipts

-- ============ STORY CHAPTERS ============
CREATE TABLE IF NOT EXISTS story_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE story_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_chapters_select_all" ON story_chapters;
CREATE POLICY "story_chapters_select_all" ON story_chapters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "story_chapters_insert_own" ON story_chapters;
CREATE POLICY "story_chapters_insert_own" ON story_chapters FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_chapters.story_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "story_chapters_update_own" ON story_chapters;
CREATE POLICY "story_chapters_update_own" ON story_chapters FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_chapters.story_id AND s.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_chapters.story_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "story_chapters_delete_own" ON story_chapters;
CREATE POLICY "story_chapters_delete_own" ON story_chapters FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_chapters.story_id AND s.user_id = auth.uid())
);

-- Add is_draft and cover_photo to stories
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cover_photo_url text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- ============ BLOCKED USERS ============
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_users_select_own" ON blocked_users;
CREATE POLICY "blocked_users_select_own" ON blocked_users FOR SELECT TO authenticated USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "blocked_users_insert_own" ON blocked_users;
CREATE POLICY "blocked_users_insert_own" ON blocked_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "blocked_users_delete_own" ON blocked_users;
CREATE POLICY "blocked_users_delete_own" ON blocked_users FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- ============ BUG REPORTS ============
CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'bug' CHECK (category IN ('bug','feature','security','other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bug_reports_select_own" ON bug_reports;
CREATE POLICY "bug_reports_select_own" ON bug_reports FOR SELECT TO authenticated USING (
  auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "bug_reports_insert_own" ON bug_reports;
CREATE POLICY "bug_reports_insert_own" ON bug_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "bug_reports_update_admin" ON bug_reports;
CREATE POLICY "bug_reports_update_admin" ON bug_reports FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator'))
);

-- ============ AD TYPES ============
ALTER TABLE ads ADD COLUMN IF NOT EXISTS ad_type text NOT NULL DEFAULT 'sponsored' CHECK (ad_type IN ('google','sponsored','admin'));
ALTER TABLE ads ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS end_date timestamptz;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS budget integer DEFAULT 0;

-- ============ COVER PHOTO ON PROFILES ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- ============ NOTIFICATION SETTINGS ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light'));

-- ============ POST BOOKMARKS ============
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_bookmarks_select_own" ON post_bookmarks;
CREATE POLICY "post_bookmarks_select_own" ON post_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_bookmarks_insert_own" ON post_bookmarks;
CREATE POLICY "post_bookmarks_insert_own" ON post_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_bookmarks_delete_own" ON post_bookmarks;
CREATE POLICY "post_bookmarks_delete_own" ON post_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ TYPING INDICATORS ============
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_delivered boolean NOT NULL DEFAULT true;

-- ============ COIN PACKAGES IN SHOP ============
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS is_coin_package boolean NOT NULL DEFAULT false;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS bonus_percent integer NOT NULL DEFAULT 0;

-- Grant permissions
GRANT ALL ON story_chapters TO authenticated;
GRANT ALL ON blocked_users TO authenticated;
GRANT ALL ON bug_reports TO authenticated;
GRANT ALL ON post_bookmarks TO authenticated;
