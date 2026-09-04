# Flip Admin Master - Developer Handoff Documentation

## Overview

The Flip Admin Master panel is a secure administrative interface built on top of the existing Flip social platform. It provides platform-wide management capabilities through a structured dashboard with summary cards and a comprehensive module drawer.

## Files Modified

1. **`src/screens/ProfileScreen.tsx`** - Added email-authorized "Admin Panel" button
2. **`src/screens/AdminScreen.tsx`** - Expanded to 10 dashboard cards, 60 modules, slide-out drawer, Home button
3. **`src/index.css`** - Added `slideInLeft` animation for the drawer

## Authentication Flow

### Step 1: Email Authorization (Profile Screen)

The "Admin Panel" button on the User Profile screen is **only visible** to three authorized email addresses:

```
fransiscomanongi@gmail.com
ff7739537@gmail.com
adamufrank55@gmail.com
```

The check is in `ProfileScreen.tsx`:
```typescript
const AUTHORIZED_ADMIN_EMAILS = [
  'fransiscomanongi@gmail.com',
  'ff7739537@gmail.com',
  'adamufrank55@gmail.com',
];
const isAdmin =
  (profile.role === 'admin' || profile.role === 'moderator') &&
  AUTHORIZED_ADMIN_EMAILS.includes(profile.email?.toLowerCase() ?? '');
```

Both conditions must be true:
- The user's `role` must be `admin` or `moderator`
- The user's `email` must match one of the three authorized addresses (case-insensitive)

### Step 2: Password Gate (Admin Screen)

Tapping the "Admin Panel" button navigates to `AdminScreen`, which presents a password gate. The exact password required is:

```
1234,.,@kilimanjaro.Ffm
```

The password check is in `AdminScreen.tsx`:
```typescript
const MASTER_PASSWORD = '1234,.,@kilimanjaro.Ffm';
```

Only after entering the correct password does the admin dashboard become accessible.

### Step 3: Admin Dashboard Access

Once authenticated, the admin sees the "FLIP ADMIN MASTER" dashboard with 10 summary cards and a hamburger menu that opens a slide-out drawer containing 60 management modules.

## Exterior Dashboard - 10 Summary Cards

The dashboard landing page displays exactly 10 summary cards:

| # | Card Title | Icon | Description |
|---|-----------|------|-------------|
| 1 | Users | Users | Total registered users |
| 2 | Coin | Coins | System circulation pool |
| 3 | Storage | Database | Storage usage tracking |
| 4 | White Label / System Status | Palette | All systems running status |
| 5 | Admin Assistant | Shield | Delegation & sub-admins |
| 6 | Active Reports | Flag | Pending report tickets |
| 7 | New Signups | UserPlus | Users joined today |
| 8 | Flagged Content | AlertTriangle | Flagged items count |
| 9 | Earning / Fraud Trend | TrendingUp | Fraud trend monitoring |
| 10 | Earnings Transaction Volume | BarChart3 | Transaction volume today |

Each card is tappable and navigates to its corresponding module view.

## Top Navigation Bar

The top navigation bar includes:
- **Hamburger menu button (☰)** - Opens the slide-out module drawer
- **Live search bar** - Filters modules by name in real-time
- **Notification bell** - Shows a red indicator when there are pending reports

## Interior Menu - 60 Modules

The slide-out drawer (opened via hamburger menu) contains exactly 60 modules organized into 7 categories:

### Users & Community (9 modules)
1. User Management
2. User Profiles
3. Followers Graph
4. Groups & Communities
5. Events Calendar
6. Direct Messages
7. Dating
8. Swipe / Match
9. Blind Date

### Content & Media (9 modules)
10. Posts & Comments
11. Reels
12. Stories
13. Live Streaming
14. Audio Lounge
15. Confessions
16. Mood & Vibe
17. Reports & Moderation
18. Flagged Content

### Economy & Marketplace (12 modules)
19. Coin Economy
20. Coin Transactions
21. P2P Marketplace
22. TopShop
23. Mini-Games
24. Wallet Tracker
25. Ads
26. Marketplace Listings
27. Subscriptions

### Moderation & Security (9 modules)
28. Ban Management
29. IP & Device Tracking
30. Fraud Detection
31. KYC Verification
32. Audit Logs
33. Security Policies
34. Rate Limiting
35. Role & Permissions
36. Admin Assistant

### System & Infrastructure (13 modules)
37. System Health
38. Database Metrics
39. Storage Management
40. CDN Management
41. Backup & Restore
42. Data Export
43. Maintenance Mode
44. Feature Flags
45. A/B Testing
46. API Keys
47. Webhooks
48. White Label Config

### Marketing & Growth (7 modules)
49. Push Notifications
50. In-App Notifications
51. Announcements
52. Referrals
53. Analytics Dashboard
54. SEO Settings
55. Localization
56. Theme & Branding

### Compliance & Legal (4 modules)
57. Email Service
58. SMS Gateway
59. GDPR Requests
60. Tax & Compliance

## Implemented vs Placeholder Views

The following modules have full data-backed implementations connected to Supabase:

- **User Management** - Full CRUD with search, edit, ban/unban, delete, verify
- **Posts & Comments** - List, delete posts, delete comments
- **Messages** - List and delete messages
- **TopShop** - Full CRUD for shop items with categories, coin packages, bonuses
- **Ads Manager** - Full CRUD for ads (Google, Sponsored, Admin types)
- **Reports & Moderation** - Resolve/dismiss reports
- **Announcements** - Create and broadcast announcements
- **Maintenance Mode** - Toggle maintenance and rate limiting
- **Backup & Restore** - Backup controls
- **API Keys** - Key status display
- **Analytics** - Platform-wide metrics grid
- **White Label Config** - Brand settings
- **Admin Assistant** - Sub-admin delegation with password generation
- **Coin Economy** - Circulation pool and top-up controls
- **Storage Management** - Usage breakdown
- **New Signups** - Today's signups list
- **Earnings & Transaction Volume** - Transaction history
- **Generic Data Views** - Live, Games, Audio, Stories, Reels, Dating, Confessions, Mood, Friends, Swipe, Blind Date

All other modules display a clean placeholder view with a standardized layout (Metrics, Data Table, Settings, Filters, Export, Audit Log slots) ready for future feature hookup.

## Home Button (Exit Navigation)

A single "Home" button is fixed at the bottom-right of the admin panel. Tapping it instantly exits the admin panel and returns the user to the standard user home screen. The button uses a gradient amber-to-orange style matching the admin theme.

## Codebase Setup

### Prerequisites
- Node.js 18+
- npm

### Environment Variables
The project uses Supabase and Firebase. Required environment variables are in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Firebase config (optional, falls back gracefully)

### Development
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Type Check
```bash
npm run typecheck
```

## Architecture Notes

- **Routing**: The app uses simple state-based routing (`view` state in `App.tsx`) with three views: `main`, `profile`, `admin`.
- **State Management**: React Context for auth (`AuthContext`), theme (`ThemeContext`), and Zustand for other state.
- **Database**: Supabase (PostgreSQL) with RLS policies. All admin queries use the authenticated Supabase client.
- **Auth**: Supabase Auth with email/password, mirrored to Firebase when configured.
- **Icons**: All icons from `lucide-react`.
- **Styling**: Tailwind CSS with custom animations in `src/index.css`.

## Future Updates

When adding new admin modules:
1. Add the module key to the `AdminView` type in `AdminScreen.tsx`
2. Add a `MENU_ITEMS` entry with label, icon, and group
3. Add view rendering logic in the `renderView()` function
4. If the module has data, create a dedicated view component; otherwise, the `PlaceholderView` will handle it automatically
5. Ensure the total module count remains at 60 unless explicitly expanding
