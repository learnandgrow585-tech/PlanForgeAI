# PlanForge AI

AI-powered **Planning Operating System** — turn any goal into a structured
12-section plan with milestones, risk analysis and a success score.

Built on the zero-cost OSS stack from the dev plan: Turborepo monorepo,
Next.js 15 + NestJS 10, Prisma/PostgreSQL, Redis, and a swappable AI layer
(mock → Gemini → Groq → Ollama) you flip with a single env var.

> **Scope of this scaffold:** this repository implements the **Phase 1
> foundation** end-to-end (monorepo, Docker stack, DB schema + seed, auth,
> the full AI abstraction layer, the universal planning engine, and a
> frontend shell). Phases 2–6 (more planners, knowledge hub, admin, SEO,
> deploy) are extended on top of this base using the per-phase Claude Code
> prompts in the original plan.

## What's here

```
planforge-ai/
├── apps/
│   ├── api/                 # NestJS 10 backend
│   │   ├── prisma/          # schema.prisma + seed.ts (super admin + 3 planners)
│   │   └── src/
│   │       ├── modules/ai/  # provider interface + mock/gemini/groq/ollama + dynamic module
│   │       ├── modules/auth/        # JWT access+refresh, argon2, guard, @CurrentUser
│   │       ├── modules/planning-engine/   # the universal engine
│   │       ├── modules/planners/    # marketplace listing
│   │       ├── modules/plans/       # CRUD + SSE streaming + revision
│   │       └── common/      # Zod pipe, global exception filter
│   └── web/                 # Next.js 15 App Router (landing, login, dashboard)
├── packages/
│   ├── shared-types/        # PlanJSON (12 sections) + PlannerConfig — Zod schemas
│   └── config/              # shared tsconfig + eslint preset
├── infra/
│   ├── docker-compose.yml   # postgres, redis, minio, mailhog, prometheus, grafana
│   └── prometheus.yml
└── turbo.json
```

## Quick start

```bash
# 1. install
npm install

# 2. env
cp .env.example .env

# 3. start infrastructure (Docker Desktop must be running)
npm run infra:up

# 4. database
npm run db:migrate    # creates tables
npm run db:seed       # super admin + Wealth/Goal/Career planners

# 5. run everything (web :3000, api :4000)
npm run dev
```

Default AI provider is `mock` — the entire app works with **zero API calls**.
To use real AI, set in `.env`:

```bash
AI_PROVIDER=gemini      # 1M free tokens/day — get a key at aistudio.google.com
GEMINI_API_KEY=AIza...
# or: AI_PROVIDER=groq  (console.groq.com) | AI_PROVIDER=ollama (local llama3.1)
```

## Local service URLs

| Service        | URL                          |
| -------------- | ---------------------------- |
| Web app        | http://localhost:3000        |
| API            | http://localhost:4000/api    |
| API health     | http://localhost:4000/api/health |
| Mailhog        | http://localhost:8025        |
| MinIO console  | http://localhost:9001        |
| Grafana        | http://localhost:3001 (admin/admin) |
| Prisma Studio  | `npm run db:studio` → :5555  |

## Key API endpoints

| Method | Path                          | Notes                       |
| ------ | ----------------------------- | --------------------------- |
| POST   | `/api/auth/register`          | email, password, name       |
| POST   | `/api/auth/login`             | → access + refresh tokens   |
| GET    | `/api/auth/me`                | bearer-guarded              |
| GET    | `/api/planners`               | marketplace listing         |
| GET    | `/api/plans`                  | current user's plans        |
| POST   | `/api/plans`                  | generate `{ plannerSlug, formData }` |
| GET    | `/api/plans/:slug/stream`     | SSE generation progress     |
| PATCH  | `/api/plans/:id/revise`       | conversational revision     |

## Tests

```bash
npm run test          # Vitest — AI providers + plan schema validation
```

## How the AI abstraction works

Every provider implements one interface (`AiProvider.generatePlan / revisePlan`)
returning an `Observable<PlanChunk>`. `AiModule` picks the implementation from
`AI_PROVIDER` via a `useFactory`, so switching providers never touches business
logic. All real-LLM output is validated against the canonical `PlanJSONSchema`
(12 sections) before it is stored.

## Roadmap (from the plan)

- **Phase 1 — Foundation** ✅ this scaffold
- **Phase 2** — 3 planners + dashboard, switch mock→gemini, email via Mailhog
- **Phase 3** — plugin marketplace + 6 planners (seed-only)
- **Phase 4** — Knowledge Hub (YouTube API + Gemini blog curation, PG full-text search)
- **Phase 5** — Super Admin panel + public SEO pages (TipTap CMS)
- **Phase 6** — tests, security audit, deploy to Hetzner + Coolify ($8/mo)
```
