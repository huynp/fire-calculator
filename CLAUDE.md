# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A FIRE (Financial Independence, Retire Early) calculator built with React, Express, tRPC, and MySQL. Users can create and save multiple financial scenarios to project when they'll achieve financial independence.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (runs Vite dev server + Express backend)
pnpm dev

# Build for production (builds both client and server)
pnpm build

# Start production server
pnpm start

# Type checking (no emit)
pnpm check

# Format code
pnpm format

# Run tests (Vitest, server-side only)
pnpm test

# Database migrations (generate and apply)
pnpm db:push
```

## Architecture

### Stack
- **Frontend**: React 19, Wouter (routing), Tailwind CSS 4, shadcn/ui components
- **Backend**: Express, tRPC (type-safe API), Drizzle ORM (MySQL)
- **Build**: Vite (client), esbuild (server)
- **Testing**: Vitest (server tests only)

### Directory Structure
```
fire-calculator/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui)
│   │   ├── pages/        # Route pages
│   │   ├── lib/          # Utilities (fire-calc.ts, trpc.ts)
│   │   ├── hooks/        # React hooks
│   │   └── contexts/     # React contexts (ThemeContext)
├── server/               # Express backend
│   ├── _core/            # Core backend infrastructure
│   │   ├── index.ts      # Server entry point
│   │   ├── trpc.ts       # tRPC setup
│   │   ├── context.ts    # tRPC context (user, req, res)
│   │   ├── oauth.ts      # OAuth integration
│   │   └── vite.ts       # Vite dev server integration
│   ├── routers.ts        # tRPC router definitions
│   ├── db.ts             # Database queries
│   └── *.test.ts         # Vitest tests
├── drizzle/              # Database schema and migrations
│   └── schema.ts         # MySQL table definitions
└── shared/               # Shared types between client and server
```

### Key Architecture Patterns

**Full-stack Type Safety**: tRPC provides end-to-end type safety from database to frontend. The `AppRouter` type is exported from `server/routers.ts` and consumed by the client's tRPC hooks.

**Development vs Production**:
- Development: `server/_core/index.ts` runs Express with Vite middleware for HMR
- Production: `server/index.ts` serves pre-built static files from `dist/public`

**Authentication Flow**:
- OAuth integration through `server/_core/oauth.ts`
- Session cookies managed by `server/_core/cookies.ts`
- User context injected into tRPC procedures via `server/_core/context.ts`
- Protected procedures use `protectedProcedure` which requires authenticated user

**Database Layer**:
- Drizzle ORM with MySQL backend
- Lazy database connection (see `getDb()` in `server/db.ts`)
- All FIRE scenario operations verify user ownership before mutation

**FIRE Calculation**: Core logic in `client/src/lib/fire-calc.ts`
- Projects balance growth vs FIRE number (annual expenses / safe withdrawal rate)
- Accounts for inflation adjusting expenses over time
- Generates yearly projections up to 50 years

## Testing

Tests are located in `server/**/*.test.ts` and run with Vitest. Only server-side code has tests currently.

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/fireScenarios.test.ts
```

## Database

Schema defined in `drizzle/schema.ts` with two main tables:
- `users`: Core user table with Manus OAuth integration
- `fire_scenarios`: Stores user's FIRE calculation scenarios

Use `pnpm db:push` to generate migrations and apply them to the database. Requires `DATABASE_URL` environment variable.

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:
- `@/*`: maps to `client/src/*`
- `@shared/*`: maps to `shared/*`
- `@assets/*`: maps to `attached_assets/*`

## Design Philosophy

Flat, light finance-app look (think Mercury / Stripe / Wealthfront), not glassmorphism:
- Off-white page (`--background`), white cards with a 1px border and no shadow
- One accent (deep green `--primary`); chart series in `--chart-*` tokens (validated colorblind-safe pair for income/expenses)
- Inter; numbers carry the page (one hero figure, then stat tiles); no emoji, gradients or background images
- Light theme only (`ThemeProvider` default)

## Important Notes

- Package manager is pnpm (locked via `packageManager` field)
- Uses ESM modules throughout (`"type": "module"`)
- All numeric financial values stored as strings in database (using decimal type)
- Server finds available port automatically if 3000 is busy
