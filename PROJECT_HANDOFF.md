# FLIP — Project Handoff Documentation

> **Last updated:** 2026-09-02
> **Status:** Production-ready, build passing, database security hardened

---

## 1. Overview

FLIP is a full-featured social media and entertainment platform built as a single-page React application. It combines social networking, content creation, gaming, a virtual economy, and real-time interaction features.

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + PostCSS
- **Icons:** lucide-react
- **Toasts:** react-hot-toast
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Firebase:** Configured for additional storage/realtime features
- **Deployment:** Netlify-ready static build

---

## 2. Project Structure

```
src/
├── App.tsx                  # Root component, routing, auth gate
├── main.tsx                 # Entry point
├── index.css                # Tailwind directives + global styles
├── components/
│   ├── AppShell.tsx         # Main layout shell with bottom nav + top bar
│   ├── AdBanner.tsx         # Rotating ad banner component
│   ├── ErrorBoundary.tsx    # Global error boundary (prevents white screens)
│   ├── FloatingHearts.tsx   # Animated heart particles for like interactions
│   ├── NotificationCenter.tsx # Real-time notification dropdown
│   └── Skeleton.tsx          # Loading skeleton placeholders
├── context/
│   └── AuthContext.tsx       # Auth provider: session, profile, login/logout/signup
├── lib/
│   ├── supabase.ts           # Supabase client singleton
│   ├── firebase.ts           # Firebase client (storage/realtime)
│   ├── security.ts           # Client-side security: rate limiting, input sanitization, amount validation
│   ├── coinEconomy.ts        # Virtual coin economy logic
│   ├── configManager.ts      # Server config management
│   ├── localAuth.ts          # Local auth fallback helpers
│   └── mediaCompression.ts   # Media compression utility (image/audio/video)
├── config/
│   └── serverConfig.ts       # Server/API configuration
├── screens/
│   ├── AuthScreen.tsx        # Login + signup
│   ├── OnboardingWizard.tsx  # New user onboarding flow
│   ├── FeedPage.tsx          # Main social feed (posts, likes, comments)
│   ├── ProfileScreen.tsx     # User profile (view/edit, stats)
│   ├── MessagesScreen.tsx    # Real-time chat
│   ├── FriendsScreen.tsx     # Friends list, requests, suggestions
│   ├── SwipeMatchScreen.tsx  # Tinder-style swipe/match
│   ├── DatingScreen.tsx      # Dating rooms
│   ├── BlindDateScreen.tsx   # Anonymous blind date matching
│   ├── LiveScreen.tsx        # Live streaming
│   ├── ReelsScreen.tsx       # Short video reels
│   ├── StoriesScreen.tsx     # Multi-chapter story writing/reading
│   ├── ConfessionsScreen.tsx # Anonymous confessions with moods
│   ├── AudioLoungeScreen.tsx # Clubhouse-style audio rooms
│   ├── MoodVibeScreen.tsx    # Mood & vibe check-ins
│   ├── EventsScreen.tsx      # Events with RSVP
│   ├── GamesScreen.tsx       # Mini-games + coin betting
│   ├── TopShopScreen.tsx     # Shop + P2P coin marketplace
│   ├── WalletScreen.tsx      # Virtual wallet (top-up, withdraw)
│   ├── AdsScreen.tsx         # Ad listings
│   └── AdminScreen.tsx       # Admin control panel
└── types/
    └── index.ts              # All TypeScript types/interfaces
```

---

## 3. Environment Setup

### Required Environment Variables

All variables are pre-populated in `.env`. The `.env.example` file documents the required keys:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `SUPABASE_DB_URL` | Direct Postgres connection string |
| Firebase config keys | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` |

### Local Development

```bash
npm install
npm run dev
```

The dev server starts automatically in the Bolt environment. For local development outside Bolt, run `npm run dev` after `npm install`.

### Build

```bash
npm run build
```

Produces a static build in `dist/` suitable for Netlify or any static host.

---

## 4. Database Architecture (Supabase)

### Migrations Applied

| Migration | Description |
|-----------|-------------|
| `20260820144546_flip_core_schema.sql` | Core schema: profiles, posts, comments, likes, friends, stories, reels, confessions, events, live_streams, audio_rooms, games, shop_items, wallets, transactions, notifications |
| `20260820151143_fix_signup_trigger_and_admin_emails.sql` | Fixes signup trigger and admin email whitelist |
| `20260821101318_flip_feature_upgrade.sql` | Feature upgrades: dating rooms, blind dates, mood vibes, P2P marketplace prep |
| `20260822074124_flip_p2p_marketplace_notifications.sql` | P2P marketplace tables, escrow holds, notification improvements |
| `20260822075603_local_auth_overrides.sql` | Local auth override support |
| `20260901182500_fix_signup_profile_metadata.sql` | Fixes profile metadata during signup |
| `fix_security_definer_functions` | Security hardening: fixed search_path, revoked EXECUTE on internal functions |

### Key Tables

- **profiles** — User profiles (display_name, bio, avatar_url, coins, role, is_banned)
- **posts** — Social feed posts with media support
- **comments** — Comments on posts
- **likes** — Likes on posts
- **friends** — Friend relationships (requester, addressee, status)
- **stories** / **story_chapters** — Multi-chapter story system
- **reels** — Short video reels
- **confessions** — Anonymous confessions with mood tags
- **events** / **event_rsvps** — Events with RSVP system
- **live_streams** — Live streaming
- **audio_rooms** / **audio_room_participants** — Clubhouse-style audio rooms
- **dating_rooms** — Dating room listings
- **blind_dates** — Anonymous blind date matching
- **mood_vibes** — Mood and vibe check-ins
- **games** — Mini-game catalog
- **shop_items** / **shop_purchases** — Virtual shop
- **p2p_listings** / **escrow_holds** — P2P coin marketplace with escrow
- **wallets** / **transactions** — Virtual economy
- **ads** — Advertisement listings
- **notifications** — Real-time notification system

### Row Level Security (RLS)

All tables have RLS enabled. Policies use `auth.uid()` for ownership checks. The app has a sign-in screen, so policies are scoped to `TO authenticated` with ownership predicates.

### Security Hardening (2026-09-02)

- Fixed `search_path` on `update_updated_at()` and `cleanup_old_notifications()` functions
- Revoked EXECUTE from `anon` and `authenticated` on `cleanup_old_notifications()` (internal maintenance)
- Revoked EXECUTE from `anon` on `handle_new_user()` (trigger function, not for REST API)

---

## 5. Authentication

- **Provider:** Supabase Auth (email/password)
- **Flow:** AuthScreen → login/signup → OnboardingWizard (new users) → AppShell
- **Session persistence:** Supabase manages session tokens; AuthContext restores session on page reload via `supabase.auth.getSession()`
- **Admin detection:** Profiles with `role = 'admin'` get access to AdminScreen
- **Security:** Client-side rate limiting, input sanitization, and session validation via `src/lib/security.ts`

---

## 6. Key Features

### Social
- **Feed:** Create posts with media, like, comment, share
- **Stories:** Write multi-chapter stories, browse, draft/publish
- **Reels:** Short-form video content
- **Confessions:** Anonymous posts with mood tags
- **Events:** Create events, RSVP (going/maybe)

### Communication
- **Messages:** Real-time chat via Supabase
- **Friends:** Send/accept/reject friend requests
- **Audio Lounge:** Live audio rooms with speaker/listener roles
- **Live:** Live streaming with viewer counts
- **Blind Date:** Anonymous matching with conversation topics

### Entertainment
- **Games:** Mini-games + coin betting (Over/Under, Correct Score, Jackpot)
- **Swipe Match:** Tinder-style profile swiping

### Economy
- **Wallet:** Top up, withdraw, transaction history
- **Top Shop:** Buy virtual items and coin packages
- **P2P Marketplace:** Buy/sell coins with escrow, boost listings, 10% platform commission
- **Coin Economy:** Centralized coin logic in `src/lib/coinEconomy.ts`

### Admin
- **Admin Panel:** User management, content moderation, system stats, ad management

---

## 7. Media Compression

`src/lib/mediaCompression.ts` provides automatic compression before upload:

- **Images:** Canvas-based resize (max 1280px) + JPEG re-encode at 72% quality
- **Audio:** Web Audio API re-encode to WAV at 44.1kHz, stereo max
- **Video:** MediaRecorder re-encode to WebM (VP9/VP8) at 480p, 800kbps video, 64kbps audio, 30fps, max 30s
- **Smart skip:** Files below threshold are passed through uncompressed
- **API:** `compressMedia(file)` auto-detects type; `shouldCompress(file)` checks if compression is needed

---

## 8. Security

### Client-Side (`src/lib/security.ts`)
- **Rate limiting:** Per-action rate limiting with configurable windows
- **Input sanitization:** `sanitizeFreeText()` for user-generated content
- **Amount validation:** `validateAmount()` for wallet/transaction inputs
- **Session protection:** Auth state validation, session timeout handling

### Database
- RLS enabled on all tables
- Ownership-scoped policies using `auth.uid()`
- SECURITY DEFINER functions hardened (search_path set, EXECUTE revoked)
- No `FOR ALL` policies — separate per-verb policies

### Error Handling
- Global `ErrorBoundary` component prevents white screens
- All async operations have loading and error states
- Graceful fallbacks for failed network requests

---

## 9. Responsive Design

- Mobile-first layout with bottom navigation bar
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px)
- Grid layouts adapt: 1 column mobile → 2-3 columns tablet/desktop
- Touch-optimized button sizes and spacing
- Max-width constraints on content for readability on large screens

---

## 10. Developer Guidelines

### For AI Assistants (Lovable, etc.) and Human Developers

1. **PRESERVE ORIGINAL CODE:** Do not rewrite existing UI layouts or core files. Add enhancements on top.
2. **Use `@/` imports:** `import { supabase } from '@/lib/supabase'` — not relative paths.
3. **Database changes:** Use `mcp__supabase__apply_migration` for all DDL. Never write `.sql` files to disk expecting them to run.
4. **RLS:** Every new table must have RLS enabled with 4 per-verb policies. Use `auth.uid()` for ownership.
5. **Types:** All types live in `src/types/index.ts`. Add new types there.
6. **Screens:** New screens go in `src/screens/`. Register them in `AppShell.tsx` navigation.
7. **Build check:** Run `npm run build` before finishing. Fix all errors.
8. **No purple/indigo:** Design system uses emerald/cyan/amber/rose. Do not introduce purple or violet hues.
9. **Icons:** Use `lucide-react` only. Do not install other icon libraries.
10. **Comments:** Minimal comments. Only explain non-obvious WHY, not WHAT.

### Coding Standards
- TypeScript strict mode
- Explicit function parameter types
- Import every symbol you reference
- Handle error and loading states for all async operations
- Use `maybeSingle()` for zero-or-one queries, `single()` only when a row must exist

### Git/Deployment
- Clean, modular code for smooth GitHub sync
- Static build output compatible with Netlify
- No server-side runtime required (Supabase handles backend)

---

## 11. Known Considerations

- **Firebase:** Configured but primarily used for storage. Supabase is the main backend.
- **Real-time chat:** Uses Supabase realtime subscriptions. Ensure `onAuthStateChange` uses the async IIFE pattern to avoid deadlocks.
- **P2P marketplace:** Escrow system locks coins on listing creation. 1% penalty on cancellation, 10% platform commission on sale.
- **Games:** Betting is client-side simulated (Math.random). For production, move bet resolution to an edge function.

---

## 12. Quick Reference

| What | Where |
|------|-------|
| Supabase client | `src/lib/supabase.ts` |
| Firebase client | `src/lib/firebase.ts` |
| Auth context | `src/context/AuthContext.tsx` |
| Security utils | `src/lib/security.ts` |
| Media compression | `src/lib/mediaCompression.ts` |
| Coin economy | `src/lib/coinEconomy.ts` |
| Types | `src/types/index.ts` |
| App entry | `src/App.tsx` |
| Main layout | `src/components/AppShell.tsx` |
| Error boundary | `src/components/ErrorBoundary.tsx` |
| Tailwind config | `tailwind.config.js` |
| Vite config | `vite.config.ts` |
