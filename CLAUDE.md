# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**QuickBite** — a multi-tenant SaaS for fast-food restaurant ordering. Each restaurant gets a unique slug-based URL for its menu, kitchen display, and admin back-office.

## Commands

```bash
# First-time setup (install + DB + seed)
npm run setup

# Development server
npm run dev

# Production build
npm run build

# Database
npm run db:push      # sync schema → SQLite
npm run db:seed      # seed demo restaurant (Burger Palace, password: admin123)
npm run db:studio    # Prisma Studio GUI
npm run db:generate  # regenerate Prisma client after schema changes
```

## Architecture

### Routes

| URL | Description |
|-----|-------------|
| `/` | SaaS landing page |
| `/[slug]` | Customer-facing menu + cart + order |
| `/[slug]/order/[id]` | Order tracking (polls every 8s) |
| `/kitchen/[slug]` | Kitchen kanban display (polls every 10s) |
| `/admin/[slug]` | Admin dashboard (orders, menu, settings) |
| `/admin/[slug]/login` | Admin login |

### Data model (Prisma → SQLite)

`Restaurant` → `Category` → `MenuItem` → `OrderItem` ← `Order`

- One restaurant per slug. Password-protected admin.
- `Order.status`: `PENDING` → `PREPARING` → `READY` → `DONE`
- `Order.number` is a per-restaurant auto-increment counter (not DB identity).

### Key files

- `lib/actions.ts` — all Server Actions (auth, menu CRUD, order create/status update)
- `lib/auth.ts` — JWT-based admin session via `jose` (cookie per slug: `admin_<slug>`)
- `lib/prisma.ts` — singleton PrismaClient
- `components/MenuClient.tsx` — full client-side cart + order modal
- `components/KitchenClient.tsx` — live kanban board with optimistic status updates
- `components/AdminDashboard.tsx` — tabbed admin (orders / menu / settings)
- `components/OrderTracker.tsx` — order status progress tracker

### Auth flow

- Admin auth uses a per-slug JWT cookie (`admin_<slug>`) signed with `AUTH_SECRET`.
- `requireAdmin()` in `actions.ts` verifies the token and resolves the restaurant — call it at the top of every admin Server Action.
- No user/customer auth. Customer name is a free-text field on the order form.

### Adding a new restaurant

There is no self-signup UI yet. Create a restaurant by running a seed script or via Prisma Studio. The slug becomes the URL prefix for all three views.

## Environment variables

```
DATABASE_URL=file:./dev.db
AUTH_SECRET=<min-32-char secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
