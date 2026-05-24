# Mini Lead Distribution System

A full-stack lead distribution platform built with **Next.js 14**, **Prisma ORM**, and **PostgreSQL**. Customer service requests are allocated to exactly 3 providers using a persistent round-robin algorithm with transaction safety and webhook idempotency.

---

## Tech Stack

| Layer       | Technology                        |
| ----------- | --------------------------------- |
| Framework   | Next.js 14 (App Router)           |
| Language    | TypeScript                        |
| Database    | PostgreSQL                        |
| ORM         | Prisma                            |
| Styling     | Tailwind CSS                      |
| Real-time   | Client-side polling (5s interval) |
| Deployment  | Vercel + Neon PostgreSQL           |

---

## Features

- **Customer Service Request Form** — Submit leads with service type selection
- **Lead Allocation Engine** — Assigns exactly 3 providers per lead using round-robin
- **Provider Dashboard** — Real-time monitoring with 5-second polling
- **Webhook Testing Panel** — Quota reset, idempotency verification, bulk lead generation
- **Transaction Safety** — All allocations wrapped in `prisma.$transaction`
- **Duplicate Prevention** — Composite unique constraint `@@unique([phone, serviceType])`
- **Persistent Round-Robin** — Rotation state survives server restarts via `AllocationState` table
- **Webhook Idempotency** — `WebhookEvent` table prevents duplicate processing

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  Next.js 14 App                  │
├──────────────┬──────────────┬────────────────────┤
│  /request-   │  /dashboard  │    /test-tools     │
│   service    │  (polls 5s)  │  (webhook panel)   │
├──────────────┴──────────────┴────────────────────┤
│                  API Routes                       │
│  POST /api/leads  │  GET /api/providers           │
│  POST /api/test-webhook                           │
├───────────────────────────────────────────────────┤
│              Allocation Engine                    │
│  src/lib/allocator.ts (prisma.$transaction)       │
├───────────────────────────────────────────────────┤
│                Prisma ORM                         │
├───────────────────────────────────────────────────┤
│               PostgreSQL                          │
│  Lead │ Provider │ LeadAllocation │ AllocationState│
│  WebhookEvent                                     │
└───────────────────────────────────────────────────┘
```

---

## Allocation Algorithm

Each lead is assigned to **exactly 3 providers** inside a single database transaction:

### Step 1: Mandatory Provider Assignment
| Service Type | Mandatory Providers |
| ------------ | ------------------- |
| SERVICE_1    | Provider 1          |
| SERVICE_2    | Provider 5          |
| SERVICE_3    | Provider 1, Provider 4 |

### Step 2: Round-Robin Pool Fill
Remaining slots are filled from the service's provider pool:
| Service Type | Pool Providers | Slots to Fill |
| ------------ | -------------- | ------------- |
| SERVICE_1    | P2, P3, P4     | 2             |
| SERVICE_2    | P6, P7, P8     | 2             |
| SERVICE_3    | P2, P3, P5, P6, P7, P8 | 1    |

### Step 3: Persistent Round-Robin
- The `AllocationState` table stores `lastProviderId` per service type.
- On each allocation, the pool is rotated to start **after** the last assigned provider.
- Eligible providers (active + under quota) are selected from the rotated order.
- After allocation, `lastProviderId` is updated in the database.
- This persists across server restarts — no in-memory state.

### Step 4: Atomic Commit
All operations run inside `prisma.$transaction`:
1. Check for duplicate lead (phone + serviceType)
2. Fetch and validate mandatory providers (active, under quota)
3. Load round-robin state and rotate pool
4. Create `Lead` record
5. Create 3 `LeadAllocation` records
6. Increment `currentLeadsCount` on all 3 providers
7. Update `AllocationState.lastProviderId`

If **any step fails**, the entire transaction rolls back. Zero partial writes.

---

## Transaction Safety

- All allocation logic runs in a single `prisma.$transaction(async (tx) => { ... })`.
- If a mandatory provider is inactive or over-quota, the transaction throws and rolls back.
- If fewer than 3 eligible providers can be found, the transaction throws and rolls back.
- Database-level `@@unique([phone, serviceType])` catches concurrent duplicate submissions.
- Database-level `@@unique([leadId, providerId])` prevents double-assigning a provider.

---

## Webhook Idempotency

The webhook system uses a `WebhookEvent` table to track processed events:

1. Each webhook call includes an `eventId` (idempotency key).
2. Before processing, the API checks if this `eventId` already exists.
3. If found → returns success with `alreadyProcessed: true`. No side effects.
4. If not found → processes the event inside a transaction and records the `eventId`.
5. Race condition safety: the `@unique` constraint on `eventId` catches concurrent duplicates at the database level.

---

## Real-Time Dashboard

The provider dashboard uses **client-side polling** for real-time updates:

- On mount, fetches all provider data from `GET /api/providers`.
- Sets a `setInterval` that re-fetches every **5 seconds** silently (no loading spinner flash).
- Displays provider cards with quota progress bars, lead counts, and assigned lead details.
- Automatically reflects new allocations and quota resets without page reload.

---

## Setup Instructions

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or hosted)
- npm

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd lead-distribution-system
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` with your PostgreSQL connection string:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lead_dist_db?schema=public"
```

### 3. Run Database Migration
```bash
npx prisma migrate dev --name init
```

### 4. Seed the Database
```bash
npx prisma db seed
```
This creates 8 providers (provider_1 through provider_8) with quota=10 and initializes allocation states for all 3 service types.

### 5. Start Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000)

### 6. (Optional) Open Prisma Studio
```bash
npx prisma studio
```
Visual database browser at [http://localhost:5555](http://localhost:5555)

---

## Deployment (Vercel + Neon PostgreSQL)

### 1. Create Neon Database
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy the connection string (with `?sslmode=require`)

### 2. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. Deploy to Vercel
1. Import your GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Add environment variable:
   - `DATABASE_URL` = your Neon connection string
3. Set **Build Command** to: `npm run vercel-build`
4. Deploy

### 4. Seed Production Database
After deployment, run locally against the production database:
```bash
DATABASE_URL="your-neon-connection-string" npx prisma db seed
```

### Common Deployment Fixes
| Issue | Fix |
| ----- | --- |
| `prisma: command not found` | Ensure `postinstall: "prisma generate"` is in package.json |
| `Can't reach database` | Check DATABASE_URL has `?sslmode=require` for Neon |
| `Migration not applied` | Use `vercel-build` script or run `prisma migrate deploy` manually |
| `P2002 unique constraint` | Database already seeded — this is expected, upserts handle it |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── leads/route.ts           # POST: Create lead + allocate
│   │   ├── providers/route.ts       # GET: Dashboard data
│   │   └── test-webhook/route.ts    # POST: Idempotent webhook
│   ├── dashboard/page.tsx           # Provider dashboard (polling)
│   ├── request-service/page.tsx     # Customer request form
│   ├── test-tools/page.tsx          # Testing panel
│   ├── layout.tsx                   # Root layout + metadata
│   ├── page.tsx                     # Home navigation hub
│   └── globals.css                  # Tailwind imports
├── lib/
│   ├── allocator.ts                 # Round-robin allocation engine
│   └── prisma.ts                    # Prisma client singleton
prisma/
├── schema.prisma                    # Database schema
└── seed.ts                         # Database seed script
.env.example                        # Environment template
```

---

## Testing Checklist

- [ ] **Duplicate Lead Prevention** — Submit same phone + service twice → second attempt returns 400
- [ ] **Quota Enforcement** — Fill a provider to quota=10 → they stop receiving leads
- [ ] **Exact 3 Provider Allocation** — Every successful lead shows exactly 3 assigned providers
- [ ] **Round-Robin Fairness** — Submit multiple leads for same service → providers rotate evenly
- [ ] **Webhook Idempotency** — Fire same webhook 3x → quota resets only once
- [ ] **Dashboard Real-Time** — Submit a lead → dashboard updates within 5 seconds
- [ ] **Concurrency** — Generate 10 leads simultaneously → no duplicate allocations, no count drift
- [ ] **Transaction Rollback** — Disable a mandatory provider → allocation fails cleanly with no partial data

---

## License

MIT
