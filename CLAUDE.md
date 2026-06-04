# HappyBook (EpicTake)

Film & series review + tracking community. Browse films, build your shelf, rate/review, read a blog. (package name `happybook`; originated as a book-swap site, now film-focused.)

## Stack
- React 18 + Vite 5 + TypeScript (strict) — SPA, `@vitejs/plugin-react-swc`
- UI: shadcn/ui (Radix primitives) + Tailwind CSS + `tailwindcss-animate`, lucide-react icons
- Routing: react-router-dom v6 (`BrowserRouter`)
- Data: @tanstack/react-query + Supabase (`@supabase/supabase-js`)
- Forms/validation: react-hook-form + zod
- Auth: LetMeUse (script-injected `window.letmeuse`, no npm dep) — see `src/hooks/use-auth.ts`
- Image uploads: client compress (canvas) → POST to `duk.tw` (`src/lib/upload.ts`)
- Testing: Vitest + Testing Library (jsdom); Playwright E2E
- Build tooling note: dev/build via Vite; `bun.lockb` present (bun installable) but README uses npm

## Directory structure
```
src/
  main.tsx          ← entry, mounts <App/>
  App.tsx           ← QueryClient + Router; all routes defined here
  pages/            ← route components (Browse, MyShelf, UserShelf, AddBook,
                      WriteReview, Reviews, UserReviews, FilmDetail,
                      Blog, BlogPost, BlogShow, Terms, Rules, NotFound)
  components/        ← Navigation, Footer, BookCard, BookShelf, BookSpine,
                      BookDetailDialog, ProfileCard
  components/ui/     ← shadcn/ui primitives (generated; avoid hand-editing)
  hooks/            ← use-auth, use-profile, use-my-films, use-game-stats,
                      use-mobile, use-toast
  lib/              ← selfize, game-config, blog-data, upload, utils (cn helper)
  integrations/supabase/ ← client.ts (generated), types.ts (DB types)
  test/setup.ts     ← Vitest setup
supabase/
  config.toml
  migrations/       ← SQL schema (profiles, books/films, swaps; gamification)
scripts/            ← seed.mjs, fix-covers.mjs, check-covers.mjs (Node data scripts)
docs/superpowers/   ← design specs + implementation plans
public/  dist/      ← static assets / build output
```

## Key concepts
- **Routing**: All routes are declared in `src/App.tsx`. Key paths: `/` (Browse), `/my` (MyShelf), `/my/add`, `/my/edit/:id`, `/my/review/:bookId`, `/film/:title`, `/reviews`, `/blog/:slug`.
- **Auth (LetMeUse)**: No Supabase Auth UI. `window.letmeuse` is injected by an external script; `useAuth()` polls until ready and subscribes via `onAuthChange`. Users are mirrored into a `profiles` table keyed by `letmeuse_id`.
- **Supabase data**: Public read + public write RLS policies — authorization is enforced client-side via LetMeUse, NOT in the database. Treat the DB as untrusted-writable. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Schema evolution**: `books` table holds film/series records (status `available` / `lent_out`); `swaps` track lending (`active` / `returned`); gamification migration adds stats. See `supabase/migrations/`.
- **Images**: `uploadCoverPhoto()` compresses to max 1200px JPEG (q0.8) then uploads to `duk.tw`, returning a short URL stored in the DB.
- **Path alias**: `@/` → `src/` (configured in vite + tsconfig).
- **Dev server**: runs on port **8080** (not Vite default 5173); Playwright `baseURL` matches.
- **lovable-tagger**: dev-only Vite plugin (component tagging); active only in development mode.

## Commands
```bash
npm install            # or: bun install
npm run dev            # Vite dev server → http://localhost:8080
npm run build          # production build → dist/
npm run build:dev      # build in development mode
npm run preview        # preview the built dist/
npm run lint           # eslint .
npm test               # vitest (watch)
npm run test:coverage  # vitest --coverage
npm run test:ui        # vitest --ui
npm run test:e2e       # playwright test (tests/ dir; auto-starts dev server)
npm run test:e2e:headed / test:e2e:ui
node scripts/seed.mjs  # seed/fix data scripts (also fix-covers, check-covers)
```
Deploy: `npm run build`, then ZIP `dist/` and upload to pipee.tw (per README).

## Coding rules
- Imports use the `@/` alias for `src/`.
- `src/components/ui/*` are generated shadcn primitives — extend via composition, don't hand-edit.
- `integrations/supabase/client.ts` and `types.ts` are generated ("Do not edit directly").
- No test files exist in `src/`/`tests/` yet despite Vitest + Playwright config — add under those when writing tests.
