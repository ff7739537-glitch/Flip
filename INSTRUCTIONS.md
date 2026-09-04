# FLIP Platform - Developer Guide & Blueprint

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Supabase project (free tier works)

### Installation

```bash
# 1. Unzip the project
unzip flip-social-platform.zip
cd flip-social-platform

# 2. Install all dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open in your browser
# The dev server URL will appear in the terminal (typically http://localhost:5173)
```

### Build for Production
```bash
npm run build      # Creates optimized production build in dist/
npm run preview    # Preview the production build locally
npm run typecheck  # Run TypeScript type checking
npm run lint       # Run ESLint
```

---

## Environment Configuration

The project uses a `.env` file at the project root. The following variables are pre-configured:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `SUPABASE_DB_URL` | Direct Postgres connection string |

### Connecting Your Own Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** to find your URL and keys
3. Replace the values in `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Run the SQL migrations in `supabase/migrations/` via the Supabase SQL Editor in order:
   - `20260820144546_flip_core_schema.sql`
   - `20260820151143_fix_signup_trigger_and_admin_emails.sql`
   - `20260821101318_flip_feature_upgrade.sql`
   - `20260822074124_flip_p2p_marketplace_notifications.sql`
   - `20260822075603_local_auth_overrides.sql`

---

## Centralized Server Configuration

The file `src/config/serverConfig.ts` provides a single place to manage external service connections (databases, API endpoints, WebSocket nodes, AI services). Edit this file to point FLIP at your own backends without touching core application logic.

```typescript
// Example: switching to a custom WebSocket node
import { updateServerConfig, ServerKey } from '@/config/serverConfig';
updateServerConfig(ServerKey.WEBSOCKET_URL, 'wss://my-node.example.com');
```

---

## Connecting External AI Models

FLIP has placeholder slots for AI services in `src/lib/configManager.ts`. To connect an AI model:

1. Open **Admin Panel → API Keys Manager**
2. Enter your API key for the desired service (OpenAI, DeepAI, etc.)
3. The keys are stored locally and can be referenced in edge functions

Alternatively, set them directly in the config module:
```typescript
import { updateConfigValue } from '@/lib/configManager';
updateConfigValue('openai_api_key', 'sk-your-key');
```

---

## Master Admin Configuration

### Master Admin Emails
Only these 4 emails have full Master Admin access:
- `fransiscomanongi@gmail.com`
- `adamufrank55@gmail.com`
- `adamumanongi@gmail.com`
- `frankadamu123@gmail.com`

### Master Password
The Admin panel requires a master password:
```
1234,.,Kilimanjaro
```

### How Admin Access Works
1. Sign up with one of the 4 master admin emails above
2. The system automatically assigns the `admin` role
3. Navigate to **Profile → Admin Panel**
4. Enter the master password when prompted
5. Full admin dashboard becomes available

Regular users (`role: 'user'`) have zero visibility or access to the Admin panel.

---

## Sub-Admin / Assistant Delegation

### How to Delegate
1. Log in as a Master Admin and open the Admin Panel
2. Go to **Admin Delegation** (in the Core menu group)
3. Search for any user by name or email
4. Click **Delegate** next to the user
5. Choose a role:
   - **Moderator** - Content and user moderation access
   - **Admin** - Full admin access (use with caution)
6. Generate or type a custom secure password for the sub-admin
7. Click **Confirm Delegation**

### Revoking Sub-Admin Access
1. Go to **Admin Delegation**
2. Find the sub-admin in the "Current Sub-Admins" list
3. Click **Revoke**
4. The user's role reverts to `user` and their custom credentials are removed

Only the 4 Master Admins can delegate or revoke sub-admin roles.

---

## P2P Escrow Vault (Top Shop)

### How the Escrow System Works

**When a seller lists coins for sale:**
1. The seller specifies coin amount, price per 1000 coins, and payment method
2. The specified coins are **instantly locked** in an Escrow Vault
3. The seller's wallet balance is deducted immediately
4. The listing appears in the P2P Marketplace as "active"

**When a seller cancels a listing:**
1. The locked coins are returned to the seller's wallet
2. A **1% penalty fee** is deducted from the returned amount
3. The listing is marked as "cancelled" and removed from active view

**When a buyer purchases a P2P listing:**
1. The buyer clicks "Buy Now" on a listing
2. The escrowed coins are released to the buyer's wallet
3. The seller receives the coin amount minus a **10% platform commission**
4. The listing is marked as "sold" with a red "Sold Out" badge
5. Both parties receive transaction records

**Boosting a listing:**
- Sellers can spend 3 coins to boost their listing to the top for 24 hours
- Boosted listings appear with a lightning bolt icon and amber border

### Admin Marketplace Control
- Master Admins can monitor all P2P transactions via the Admin Panel
- Admins can lock suspicious accounts (via User Management → Edit → Suspend/Ban)
- All transactions are logged in the `transactions` table for audit

---

## Coin Economy

FLIP Coins power every module:

| Module | Coin Usage |
|--------|-----------|
| Live Streaming | 2-5 coins to enter exclusive rooms or start a Live session |
| Audio Lounge | 2-5 coins to enter or host rooms |
| Gaming | Stake coins on mini-games and sports betting |
| Boosting | 2-5 coins to boost posts, listings, ads, or reels |
| Hot Stories | Unlock premium content for micro-amounts |
| Watch-to-Earn | Watch 2-3 ads to earn free coins (rate-limited) |
| Like Milestones | 500/1000/5000/10000 likes award 50/50/100/200 coins |
| P2P Marketplace | Buy/sell coins with other users via escrow |

### Revenue Split
- Broadcasters/creators receive **80-85%** of coins
- Platform retains **10-15%** commission
- P2P sales: seller receives **90%**, platform retains **10%**

---

## Database Migrations

All schema changes are in `supabase/migrations/`. Apply them in chronological order via the Supabase SQL Editor or MCP tools.

Key tables:
- `profiles` - User accounts with roles and status
- `wallets` - Coin balances per user
- `transactions` - All coin movements (earn/spend/topup/payout/gift/reward)
- `p2p_listings` - P2P marketplace listings
- `escrow_holds` - Locked coins during P2P trades
- `notifications` - Push notification records
- `posts`, `stories`, `reels`, `live_streams` - Content modules
- `reports` - User-submitted reports for moderation
- `local_auth_overrides` - Sub-admin custom credentials

---

## Security & Rate Limiting

- **Rate limiting** is enforced client-side via `src/lib/security.ts` using localStorage counters
- **Device fingerprinting** limits accounts to 2 per device
- **Input sanitization** prevents XSS in user-generated content
- **Admin access** is gated by both email verification and master password
- **Escrow locks** prevent double-spending in P2P trades

### Rate Limit Thresholds
| Action | Limit | Window |
|--------|-------|--------|
| Coin spending | 10 actions | 60 seconds |
| Watch-to-earn | 5 actions | 5 minutes |
| Shop purchases | 5 actions | 60 seconds |
| P2P listing creation | 3 actions | 60 seconds |

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AdBanner.tsx     # Ad display banner
│   ├── AppShell.tsx     # Main app layout with bottom nav
│   ├── ErrorBoundary.tsx# Offline/error fallback
│   ├── FloatingHearts.tsx
│   ├── NotificationCenter.tsx
│   └── Skeleton.tsx
├── config/
│   └── serverConfig.ts  # Centralized external service config
├── context/
│   └── AuthContext.tsx  # Authentication state management
├── lib/
│   ├── coinEconomy.ts   # Coin spend/earn/boost/milestone logic
│   ├── configManager.ts # API key management
│   ├── localAuth.ts     # Local auth fallback
│   ├── security.ts      # Rate limiting, sanitization, device fingerprint
│   └── supabase.ts      # Supabase client
├── screens/             # Full-page views
│   ├── AdminScreen.tsx
│   ├── AuthScreen.tsx
│   ├── OnboardingWizard.tsx
│   ├── FeedPage.tsx
│   ├── LiveScreen.tsx
│   ├── GamesScreen.tsx
│   ├── TopShopScreen.tsx
│   ├── WalletScreen.tsx
│   ├── ... (all other screens)
└── types/
    └── index.ts         # TypeScript interfaces for all data models
```

---

## Troubleshooting

### White or blank screen
- Run `npm run typecheck` to find type errors
- Check the browser console for runtime errors
- Ensure all migrations have been applied to Supabase

### Missing dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection issues
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Ensure the project is not paused on Supabase
- Check that RLS policies are enabled on all tables

### Admin panel not accessible
- Confirm you are signed in with one of the 4 master admin emails
- The master password is: `1234,.,Kilimanjaro`
- Check that your profile has `role: 'admin'` in the database
