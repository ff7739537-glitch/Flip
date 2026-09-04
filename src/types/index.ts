export interface Profile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  bio: string;
  coins: number;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'banned';
  email: string | null;
  notif_enabled: boolean;
  theme: 'dark' | 'light';
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: Profile;
  privacy?: 'public' | 'friends';
  expires_at?: string | null;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: string;
  caption: string;
  views_count: number;
  created_at: string;
  expires_at: string;
  is_draft: boolean;
  cover_photo_url: string | null;
  category: string;
  author?: Profile;
  chapters?: StoryChapter[];
}

export interface StoryChapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  audio_track: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  author?: Profile;
}

export interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  stream_url: string | null;
  thumbnail_url: string | null;
  viewers_count: number;
  likes_count: number;
  category: string;
  is_live: boolean;
  started_at: string;
  ended_at: string | null;
  host?: Profile;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other_user?: Profile;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  is_delivered: boolean;
  created_at: string;
  expires_at?: string | null;
}

export interface Friend {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface EventItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url: string | null;
  max_attendees: number;
  created_at: string;
  author?: Profile;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: 'going' | 'maybe' | 'not_going';
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'earn' | 'spend' | 'topup' | 'payout' | 'gift' | 'reward';
  amount: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  category: string;
  play_count: number;
  created_at: string;
}

export interface Ad {
  id: string;
  title: string;
  image_url: string | null;
  target_url: string | null;
  placement: string;
  impressions: number;
  clicks: number;
  is_active: boolean;
  ad_type: 'google' | 'sponsored' | 'admin';
  start_date: string | null;
  end_date: string | null;
  budget: number;
  created_at: string;
}

export interface AudioRoom {
  id: string;
  host_id: string;
  title: string;
  description: string;
  topic: string;
  is_live: boolean;
  participants_count: number;
  created_at: string;
  host?: Profile;
}

export interface AudioRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'host' | 'speaker' | 'listener';
  is_muted: boolean;
  joined_at: string;
  profile?: Profile;
}

export interface DatingRoom {
  id: string;
  host_id: string;
  title: string;
  description: string;
  age_range: string;
  is_active: boolean;
  participants_count: number;
  created_at: string;
  host?: Profile;
}

export interface BlindDate {
  id: string;
  user1_id: string;
  user2_id: string | null;
  status: 'waiting' | 'matched' | 'active' | 'completed' | 'rejected';
  topic: string;
  created_at: string;
}

export interface Confession {
  id: string;
  user_id: string;
  content: string;
  mood: string;
  is_anonymous: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: Profile;
}

export interface MoodVibe {
  id: string;
  user_id: string;
  mood: string;
  vibe: string;
  note: string;
  color: string;
  created_at: string;
  author?: Profile;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  price: number;
  category: string;
  stock: number;
  sold_count: number;
  is_active: boolean;
  is_coin_package: boolean;
  bonus_percent: number;
  created_at: string;
}

export interface ShopPurchase {
  id: string;
  user_id: string;
  item_id: string;
  price_paid: number;
  quantity: number;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: Profile;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'maintenance' | 'update' | 'event';
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  profile?: Profile;
}

export interface BugReport {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  category: 'bug' | 'feature' | 'security' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  reporter?: Profile;
}

export interface PostBookmark {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface P2PListing {
  id: string;
  seller_id: string;
  coin_amount: number;
  price_per_1k: number;
  total_price: number;
  payment_method: 'mobile_money' | 'bank_transfer' | 'crypto' | 'other';
  status: 'active' | 'escrowed' | 'sold' | 'cancelled';
  buyer_id: string | null;
  is_boosted: boolean;
  boost_expires_at: string | null;
  created_at: string;
  updated_at: string;
  seller?: Profile;
}

export interface EscrowHold {
  id: string;
  listing_id: string;
  seller_id: string;
  coin_amount: number;
  status: 'held' | 'released' | 'returned' | 'penalized';
  penalty_fee: number;
  created_at: string;
  released_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'admin_broadcast' | 'friend_activity' | 'social_interaction' | 'marketplace' | 'coin' | 'system';
  title: string;
  body: string;
  target_type: string | null;
  target_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface OtpCode {
  id: string;
  phone: string;
  code: string;
  purpose: 'signup' | 'login' | 'reset';
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

export interface DeviceRegistration {
  id: string;
  device_fingerprint: string;
  user_id: string;
  phone: string | null;
  created_at: string;
}

export interface SeenPost {
  id: string;
  post_id: string;
  user_id: string;
  seen_at: string;
}

export interface SeenStory {
  id: string;
  story_id: string;
  user_id: string;
  seen_at: string;
}

export interface CoinBoost {
  id: string;
  user_id: string;
  target_type: 'post' | 'listing' | 'ad' | 'reel';
  target_id: string;
  coins_spent: number;
  boost_position: number;
  expires_at: string;
  created_at: string;
}

export interface AdWatch {
  id: string;
  user_id: string;
  ad_id: string | null;
  coins_earned: number;
  created_at: string;
}

export interface LikeMilestone {
  id: string;
  post_id: string;
  user_id: string;
  milestone: number;
  coins_awarded: number;
  created_at: string;
}

export interface DormancyTracking {
  id: string;
  user_id: string;
  last_active_at: string;
  dormancy_phase: 0 | 1 | 2 | 3 | 4;
  phase_1_notified_at: string | null;
  phase_2_prompted_at: string | null;
  phase_3_compressed_at: string | null;
  phase_4_purged_at: string | null;
  updated_at: string;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  created_at: string;
  viewer?: Profile;
}

export interface Hashtag {
  id: string;
  tag: string;
  usage_count: number;
  last_used_at: string;
  created_at: string;
}

export interface PostHashtag {
  id: string;
  post_id: string;
  hashtag_id: string;
  created_at: string;
}

export interface PostShare {
  id: string;
  sharer_id: string;
  target_type: 'post' | 'reel';
  target_id: string;
  share_url: string | null;
  platform: string;
  created_at: string;
}

export interface TypingStatus {
  id: string;
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}
