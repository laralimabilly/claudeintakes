# CLAUDE.md — Meet Line

## Project Overview

Meet Line is an AI-powered platform for startup founders that provides co-founder matching, investor evaluation, email decoding, and thesis alignment tools. Built as a Lovable.dev project with a React SPA frontend and Supabase backend.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite (port 8080)
- **Styling**: Tailwind CSS 3 + shadcn/ui (Radix UI primitives + CVA)
- **State**: React Query (TanStack) for server state, React Context for global state, URL params for filters
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router DOM v6
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI Integrations**: ElevenLabs (voice), OpenAI (generation), Vapi (calls)
- **Messaging**: Twilio WhatsApp
- **Deployment**: Vercel (SPA) + Supabase (serverless)
- **Package Manager**: npm (bun lockfile also present)

## Commands

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # ESLint
npm run preview    # Preview production build
```

## Project Structure

```
src/
├── pages/              # Route pages (Index, Auth, Admin, CofounderMatching, etc.)
├── components/
│   ├── ui/             # shadcn/ui components (45+)
│   ├── admin/          # Admin dashboard components (22 files)
│   ├── cofounder/      # Co-founder feature components
│   ├── founder-profile/# Profile display components
│   └── analytics/      # Analytics components
├── contexts/           # React Context providers (SystemParametersContext)
├── hooks/              # Custom hooks (useAdminAuth, use-mobile, use-toast)
├── types/              # TypeScript types (founder, systemParameters, matchStatus)
├── lib/                # Utils and matching logic
│   ├── matching/       # Matching algorithm modules
│   ├── matchingScore.ts
│   ├── matchingUtils.ts
│   └── utils.ts        # cn() helper
├── integrations/
│   └── supabase/
│       ├── client.ts   # Supabase client init
│       └── types.ts    # Auto-generated DB types
├── App.tsx             # Main app with routing (13 routes)
├── main.tsx            # Entry point
└── index.css           # Global styles + CSS variables
supabase/
├── functions/          # 21 Edge Functions
└── migrations/         # Database migrations
```

## Key Patterns

- **Path alias**: `@/*` maps to `./src/*`
- **Component pattern**: shadcn/ui style — Radix primitives + CVA variants + Tailwind
- **Theme colors**: CSS variables in HSL — charcoal, cream, silver, teal, maroon, gold, ochre
- **Dark mode**: Class-based via next-themes
- **Auth**: Supabase email/password auth with admin role via custom claims
- **System config**: Stored in `system_parameters` DB table, accessed via `SystemParametersContext`
- **Toast notifications**: Sonner
- **Icons**: Lucide React

## Database

Primary tables: `founder_profiles` (40+ fields), `founder_matches`, `founder_locations`, `system_parameters`

Auto-generated types in `src/integrations/supabase/types.ts` — do not edit manually.

## Edge Functions (supabase/functions/)

Core: `process-new-founder`, `compute-matches`, `get-founder-matches`, `get-profiles`, `get-public-profile`, `update-profile`

AI/Tools: `generate-taglines`, `backfill-embeddings`, `backfill-geocoding`, `parse-deck`, `decode-email`

Integrations: `elevenlabs-signed-url`, `start-call`, `vapi-webhook`, `import-vapi-calls`, `send-whatsapp-intro`, `twilio-whatsapp-webhook`

Config: `system-parameters`

## Matching Algorithm

7-dimensional scoring: skills, stage, communication, values, vision, geo, advantages. Weights are configurable via system parameters. Supports both legacy and new scoring modes.

## Environment Variables

Prefix with `VITE_` for frontend access. Key vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_OPENAI_API_KEY`.

## TypeScript Config

- Target: ES2020, module resolution: bundler
- Strict mode is relaxed (noImplicitAny, noUnusedLocals, noUnusedParameters all off)
- ESLint: `@typescript-eslint/no-unused-vars` disabled

## Notes

- This is a Lovable.dev project — components are tagged with `lovable-tagger`
- SPA routing handled by Vercel rewrite rule (`vercel.json`)
- Supabase types are auto-generated — regenerate after schema changes
