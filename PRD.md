# Product Requirements Document (PRD) — Mana Grameena

## Phase 1 Tasks: Foundation & Architecture Setup
- [x] Task 1.1: Initialize package.json with exact pinned dependencies and devDependencies
- [x] Task 1.2: Install all packages via npm without --force or --legacy-peer-deps and commit package-lock.json
- [x] Task 1.3: Configure next.config.js, tsconfig.json, tailwind.config.ts, and postcss.config.js
- [x] Task 1.4: Set up Prisma 7.10.0 schema (22 tables) and prisma.config.ts with PostgreSQL driver adapter
- [x] Task 1.5: Run prisma generate and verify generated client types
- [x] Task 1.6: Implement Supabase client architecture (browser client, SSR server client with async cookies, server-only admin client)
- [x] Task 1.7: Implement Prisma DB client singleton with pg.Pool and @prisma/adapter-pg
- [x] Task 1.8: Create base App Router structure, herbal aesthetic design tokens, layout.tsx, and page.tsx
- [x] Task 1.9: Implement automated security and build verification tests
- [x] Task 1.10: Execute full TypeScript check and next build production compilation test
- [x] Task 1.11: Review code with CodeRabbit and document findings and fixes

## Phase 2 Tasks: Database Architecture, PostgreSQL RLS Policies & Seeding Engine
- [x] Task 2.1: Correct Phase 1 documentation to accurately reflect PostgreSQL 18.3 (PGlite engine)
- [x] Task 2.2: Implement PostgreSQL Row-Level Security (RLS) policies for all 22 tables (prisma/migrations/20260915000001_rls_policies/migration.sql)
- [x] Task 2.3: Implement idempotent Prisma seed engine (prisma/seed.ts) for Mana Grameena herbal catalog
- [x] Task 2.4: Configure package.json with Prisma seed script definition
- [x] Task 2.5: Build automated Phase 2 verification suite (scripts/verify-phase2.ts)
- [x] Task 2.6: Run full verification battery (Prisma validate/generate, TypeScript check, build, verify-phase1, verify-phase2)
- [x] Task 2.7: Run CodeRabbit review & Ralph Loop verification
- [x] Task 2.8: Document Phase 2 completion, git status, and credentials gate report
