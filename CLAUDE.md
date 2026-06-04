# HappyBook

Book swap community web app — list your books, browse others' shelves, request swaps, lend/return, write reviews, and earn XP. Traditional-Chinese UI.

## Stack
- React 18 + TypeScript (strict) + Vite 5 (`@vitejs/plugin-react-swc`)
- Routing: react-router-dom v6 (`BrowserRouter`)
- Data fetching: `@tanstack/react-query` v5
- UI: shadcn/ui (Radix primitives) + Tailwind CSS 3 + lucide-react icons
- Forms/validation: react-hook-form + zod
- Toasts: sonner + Radix toast; Notifications: `Toaster` + `Sonner`
- Backend (data): **Selfize** — a PocketBase-style REST collections API (`src/lib/selfize.ts`). NOT Supabase.
- Auth: **LetMeUse** — injected `window.letmeuse` global, wrapped by `useAuth()` (`src/hooks/use-auth.ts`)
- Image uploads: client-side canvas compression → POST to `duk.tw` (`src/lib/upload.ts`)
- Tests: Vitest + Testing Library (jsdom); Playwright for E2E
- Tooling: ESLint 9 (flat config), lovable-tagger (dev-only Vite plugin)

## Directory structure
```
src/
  main.tsx            ← entry, mounts <App/>
  App.tsx             ← providers + all routes
  pages/              ← route screens (Browse, MyShelf, AddBook, SwapInbox,
                        SwapDetail, SwapWall, BookDetail, Reviews, WriteReview,
                        UserShelf, UserReviews, Terms, Rules, NotFound, ...)
  components/         ← feature components (BookCard, BookShelf, BookSpine,
                        SwapCard, SwapRequestDialog, ProfileCard, Navigation, ...)
  components/ui/      ← shadcn/ui primitives (generated; avoid hand-editing)
  hooks/             ← use-auth, use-profile, use-my-books, use-swap-requests,
                        use-game-stats, use-onboarding, use-toast, use-mobile
  lib/               ← selfize (API client + types), upload, game-config, utils
  integrations/supabase/ ← LEGACY supabase client (unused by app code)
  test/setup.ts      ← Vitest setup
supabase/migrations/ ← LEGACY SQL schema (superseded by Selfize collections)
docs/                ← design specs
public/ , dist/      ← static assets / build output
```

## Key concepts
- **Data layer = Selfize**: `selfize.list/get/create/update/delete(collection, ...)`
  hits `${VITE_SELFIZE_URL}/api/collections/<name>/records`. JSON string fields and
  `*_expanded` relations are auto-parsed. Collections: profiles, books, swaps,
  swap_requests, reviews (see typed interfaces in `src/lib/selfize.ts`).
- **Auth = LetMeUse**: `window.letmeuse` global (login/logout/getToken/onAuthChange).
  `useAuth()` polls until the global is ready, then subscribes to auth changes.
- **Supabase is legacy/dead code**: `src/integrations/supabase/` and `supabase/migrations/`
  are NOT used by current pages/hooks — all reads/writes go through Selfize. Treat the
  SQL schema only as historical reference for the data model.
- **Swap flow**: book `status` is `available | lent_out | swapping | swapped`.
  `SwapRequest` lifecycle: `pending → accepted → completed` (or `rejected/cancelled`),
  with photo confirmation (`requester_photo_url` / `owner_photo_url`).
- **Gamification**: XP rules + levels in `src/lib/game-config.ts` (e.g. ADD_BOOK=10,
  SWAP_COMPLETE=40); Chinese level titles. Surfaced via `use-game-stats`.
- **Bookshelf visualization**: `BookSpine` / `BookShelf` render books as colored spines;
  spine color derived from first tag via `getSpineColor` (`game-config.ts`).
- **Image uploads**: `uploadCoverPhoto()` compresses (max width 1200, JPEG 0.8) then
  uploads to `https://duk.tw/api/upload`, returns short URL.
- **Onboarding**: first-run dialog gated by `use-onboarding`.

## Commands
```bash
npm install
npm run dev            # Vite dev server on http://localhost:8080
npm run build          # production build → dist/
npm run build:dev      # build in development mode
npm run preview        # preview built dist/
npm run lint           # eslint
npm run test           # vitest (watch)
npm run test:coverage  # vitest with coverage
npm run test:ui        # vitest UI
npm run test:e2e       # Playwright (auto-starts dev server)
npm run test:e2e:headed / test:e2e:ui
```
Deploy: `npm run build`, then ZIP `dist/` and upload to pipee.tw (per README).

## Env vars (Vite `import.meta.env`)
- `VITE_SELFIZE_URL` (default `https://selfize.isnowfriend.com`), `VITE_SELFIZE_TOKEN`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy, unused)

## Coding rules / conventions
- Path alias `@/` → `src/` (configured in `vite.config.ts` + tsconfig).
- shadcn components live in `src/components/ui/` and are generated — prefer composition
  over editing them directly (see `components.json`).
- Keep server state in react-query; co-locate fetch logic in `src/hooks/use-*.ts`.
- UI copy is Traditional Chinese.
