/*
# FLIP Core Schema - Full Application Tables

1. Overview
   This migration creates the complete database schema for the FLIP social platform.

2. New Tables
   - profiles, posts, post_likes, post_comments, stories, reels, live_streams
   - conversations, messages, friends, events, event_rsvps
   - wallets, transactions, games, ads
   - audio_rooms, audio_room_participants, dating_rooms, blind_dates
   - confessions, mood_vibes, shop_items, shop_purchases
   - reports, announcements, admin_logs, system_settings

3. Security
   - RLS enabled on ALL tables with appropriate policies.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  display_name text NOT NULL DEFAULT 'New User',
  username text UNIQUE,
  avatar_url text,
  bio text DEFAULT '',
  coins integer NOT NULL DEFAULT 100,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','moderator')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ POSTS ============
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  media_url text,
  media_type text DEFAULT 'text',
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select_all" ON posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);

-- ============ POST LIKES ============
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select_all" ON post_likes;
CREATE POLICY "post_likes_select_all" ON post_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "post_likes_insert_own" ON post_likes;
CREATE POLICY "post_likes_insert_own" ON post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_likes_delete_own" ON post_likes;
CREATE POLICY "post_likes_delete_own" ON post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ POST COMMENTS ============
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_comments_select_all" ON post_comments;
CREATE POLICY "post_comments_select_all" ON post_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "post_comments_insert_own" ON post_comments;
CREATE POLICY "post_comments_insert_own" ON post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_comments_delete_own" ON post_comments;
CREATE POLICY "post_comments_delete_own" ON post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments (post_id);

-- ============ STORIES ============
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  media_url text,
  media_type text DEFAULT 'image',
  caption text DEFAULT '',
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories_select_all" ON stories;
CREATE POLICY "stories_select_all" ON stories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stories_insert_own" ON stories;
CREATE POLICY "stories_insert_own" ON stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "stories_delete_own" ON stories;
CREATE POLICY "stories_delete_own" ON stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories (created_at DESC);

-- ============ REELS ============
CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  caption text DEFAULT '',
  audio_track text DEFAULT '',
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  shares_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reels_select_all" ON reels;
CREATE POLICY "reels_select_all" ON reels FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reels_insert_own" ON reels;
CREATE POLICY "reels_insert_own" ON reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reels_delete_own" ON reels;
CREATE POLICY "reels_delete_own" ON reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels (created_at DESC);

-- ============ LIVE STREAMS ============
CREATE TABLE IF NOT EXISTS live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Live Stream',
  stream_url text,
  thumbnail_url text,
  viewers_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  category text DEFAULT 'general',
  is_live boolean NOT NULL DEFAULT true,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_streams_select_all" ON live_streams;
CREATE POLICY "live_streams_select_all" ON live_streams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "live_streams_insert_own" ON live_streams;
CREATE POLICY "live_streams_insert_own" ON live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "live_streams_update_own" ON live_streams;
CREATE POLICY "live_streams_update_own" ON live_streams FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "live_streams_delete_own" ON live_streams;
CREATE POLICY "live_streams_delete_own" ON live_streams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ CONVERSATIONS ============
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations_insert_participant" ON conversations;
CREATE POLICY "conversations_insert_participant" ON conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id, created_at);

-- ============ FRIENDS ============
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friends_select_participant" ON friends;
CREATE POLICY "friends_select_participant" ON friends FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "friends_insert_participant" ON friends;
CREATE POLICY "friends_insert_participant" ON friends FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "friends_update_participant" ON friends;
CREATE POLICY "friends_update_participant" ON friends FOR UPDATE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id) WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "friends_delete_participant" ON friends;
CREATE POLICY "friends_delete_participant" ON friends FOR DELETE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============ EVENTS ============
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  event_date timestamptz NOT NULL,
  location text DEFAULT '',
  image_url text,
  max_attendees integer DEFAULT 50,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_all" ON events;
CREATE POLICY "events_select_all" ON events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ EVENT RSVPS ============
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','not_going')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_rsvps_select_all" ON event_rsvps;
CREATE POLICY "event_rsvps_select_all" ON event_rsvps FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "event_rsvps_insert_own" ON event_rsvps;
CREATE POLICY "event_rsvps_insert_own" ON event_rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "event_rsvps_delete_own" ON event_rsvps;
CREATE POLICY "event_rsvps_delete_own" ON event_rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ WALLETS ============
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_select_own" ON wallets;
CREATE POLICY "wallets_select_own" ON wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallets_insert_own" ON wallets;
CREATE POLICY "wallets_insert_own" ON wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallets_update_own" ON wallets;
CREATE POLICY "wallets_update_own" ON wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('earn','spend','topup','payout','gift','reward')),
  amount integer NOT NULL,
  description text DEFAULT '',
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id, created_at DESC);

-- ============ GAMES ============
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  image_url text,
  category text DEFAULT 'arcade',
  play_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_select_all" ON games;
CREATE POLICY "games_select_all" ON games FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "games_insert_own" ON games;
CREATE POLICY "games_insert_own" ON games FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "games_update_own" ON games;
CREATE POLICY "games_update_own" ON games FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ ADS ============
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text,
  target_url text,
  placement text DEFAULT 'feed' CHECK (placement IN ('feed','sidebar','banner','popup')),
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_select_all" ON ads;
CREATE POLICY "ads_select_all" ON ads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ads_insert_own" ON ads;
CREATE POLICY "ads_insert_own" ON ads FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ads_update_own" ON ads;
CREATE POLICY "ads_update_own" ON ads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ AUDIO ROOMS ============
CREATE TABLE IF NOT EXISTS audio_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Audio Room',
  description text DEFAULT '',
  topic text DEFAULT '',
  is_live boolean NOT NULL DEFAULT true,
  participants_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audio_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audio_rooms_select_all" ON audio_rooms;
CREATE POLICY "audio_rooms_select_all" ON audio_rooms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "audio_rooms_insert_own" ON audio_rooms;
CREATE POLICY "audio_rooms_insert_own" ON audio_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "audio_rooms_update_own" ON audio_rooms;
CREATE POLICY "audio_rooms_update_own" ON audio_rooms FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "audio_rooms_delete_own" ON audio_rooms;
CREATE POLICY "audio_rooms_delete_own" ON audio_rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- ============ AUDIO ROOM PARTICIPANTS ============
CREATE TABLE IF NOT EXISTS audio_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES audio_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'listener' CHECK (role IN ('host','speaker','listener')),
  is_muted boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE audio_room_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audio_room_participants_select_all" ON audio_room_participants;
CREATE POLICY "audio_room_participants_select_all" ON audio_room_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "audio_room_participants_insert_own" ON audio_room_participants;
CREATE POLICY "audio_room_participants_insert_own" ON audio_room_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "audio_room_participants_update_own" ON audio_room_participants;
CREATE POLICY "audio_room_participants_update_own" ON audio_room_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "audio_room_participants_delete_own" ON audio_room_participants;
CREATE POLICY "audio_room_participants_delete_own" ON audio_room_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ DATING ROOMS ============
CREATE TABLE IF NOT EXISTS dating_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Dating Room',
  description text DEFAULT '',
  age_range text DEFAULT '18-35',
  is_active boolean NOT NULL DEFAULT true,
  participants_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dating_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dating_rooms_select_all" ON dating_rooms;
CREATE POLICY "dating_rooms_select_all" ON dating_rooms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "dating_rooms_insert_own" ON dating_rooms;
CREATE POLICY "dating_rooms_insert_own" ON dating_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "dating_rooms_update_own" ON dating_rooms;
CREATE POLICY "dating_rooms_update_own" ON dating_rooms FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "dating_rooms_delete_own" ON dating_rooms;
CREATE POLICY "dating_rooms_delete_own" ON dating_rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- ============ BLIND DATES ============
CREATE TABLE IF NOT EXISTS blind_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','matched','active','completed','rejected')),
  topic text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blind_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blind_dates_select_participant" ON blind_dates;
CREATE POLICY "blind_dates_select_participant" ON blind_dates FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "blind_dates_insert_own" ON blind_dates;
CREATE POLICY "blind_dates_insert_own" ON blind_dates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id);

DROP POLICY IF EXISTS "blind_dates_update_own" ON blind_dates;
CREATE POLICY "blind_dates_update_own" ON blind_dates FOR UPDATE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id) WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============ CONFESSIONS ============
CREATE TABLE IF NOT EXISTS confessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  mood text DEFAULT 'neutral',
  is_anonymous boolean NOT NULL DEFAULT true,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "confessions_select_all" ON confessions;
CREATE POLICY "confessions_select_all" ON confessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "confessions_insert_own" ON confessions;
CREATE POLICY "confessions_insert_own" ON confessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "confessions_delete_own" ON confessions;
CREATE POLICY "confessions_delete_own" ON confessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions (created_at DESC);

-- ============ MOOD & VIBE ============
CREATE TABLE IF NOT EXISTS mood_vibes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  mood text NOT NULL DEFAULT 'happy',
  vibe text DEFAULT 'chill',
  note text DEFAULT '',
  color text DEFAULT '#10b981',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mood_vibes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mood_vibes_select_all" ON mood_vibes;
CREATE POLICY "mood_vibes_select_all" ON mood_vibes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mood_vibes_insert_own" ON mood_vibes;
CREATE POLICY "mood_vibes_insert_own" ON mood_vibes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mood_vibes_delete_own" ON mood_vibes;
CREATE POLICY "mood_vibes_delete_own" ON mood_vibes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mood_vibes_created_at ON mood_vibes (created_at DESC);

-- ============ SHOP ITEMS ============
CREATE TABLE IF NOT EXISTS shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  image_url text,
  price integer NOT NULL DEFAULT 0,
  category text DEFAULT 'general',
  stock integer NOT NULL DEFAULT 100,
  sold_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_items_select_all" ON shop_items;
CREATE POLICY "shop_items_select_all" ON shop_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "shop_items_insert_own" ON shop_items;
CREATE POLICY "shop_items_insert_own" ON shop_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "shop_items_update_own" ON shop_items;
CREATE POLICY "shop_items_update_own" ON shop_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ SHOP PURCHASES ============
CREATE TABLE IF NOT EXISTS shop_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  price_paid integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_purchases_select_own" ON shop_purchases;
CREATE POLICY "shop_purchases_select_own" ON shop_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shop_purchases_insert_own" ON shop_purchases;
CREATE POLICY "shop_purchases_insert_own" ON shop_purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ REPORTS ============
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post','comment','user','story','reel','live','message','confession','shop_item')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);

-- ============ ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info','warning','maintenance','update','event')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select_all" ON announcements;
CREATE POLICY "announcements_select_all" ON announcements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "announcements_insert_admin" ON announcements;
CREATE POLICY "announcements_insert_admin" ON announcements FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

DROP POLICY IF EXISTS "announcements_update_admin" ON announcements;
CREATE POLICY "announcements_update_admin" ON announcements FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

DROP POLICY IF EXISTS "announcements_delete_admin" ON announcements;
CREATE POLICY "announcements_delete_admin" ON announcements FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

-- ============ ADMIN LOGS ============
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_logs_select_admin" ON admin_logs;
CREATE POLICY "admin_logs_select_admin" ON admin_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

DROP POLICY IF EXISTS "admin_logs_insert_own" ON admin_logs;
CREATE POLICY "admin_logs_insert_own" ON admin_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = admin_id);

-- ============ SYSTEM SETTINGS ============
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_all" ON system_settings;
CREATE POLICY "system_settings_select_all" ON system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "system_settings_update_admin" ON system_settings;
CREATE POLICY "system_settings_update_admin" ON system_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "system_settings_insert_admin" ON system_settings;
CREATE POLICY "system_settings_insert_admin" ON system_settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO system_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('coin_circulation', '1000000'),
  ('signup_bonus', '100'),
  ('max_stream_duration', '14400')
ON CONFLICT (key) DO NOTHING;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User'));
  INSERT INTO wallets (user_id, balance)
  VALUES (NEW.id, 100);
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (NEW.id, 'reward', 100, 'Signup bonus');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
