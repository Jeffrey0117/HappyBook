# HappyBook (換書不可) - Design Spec

## Overview

A book-swap community site where users list books they own, browse others' collections, and record swap transactions. Based on the read-reflect codebase with Supabase Auth replaced by LetMeUse and note features removed.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Auth**: LetMeUse (replaces Supabase Auth)
- **Database**: Supabase PostgreSQL (new schema, no RLS — use LetMeUse user_id for ownership)
- **Deployment**: pipee.tw (static site + Supabase backend)

## Data Model

### profiles table
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| letmeuse_id | TEXT | LetMeUse user ID (unique) |
| name | TEXT | Display name |
| avatar_url | TEXT | Avatar URL |
| created_at | TIMESTAMPTZ | |

### books table
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key (auto) |
| owner_id | UUID | FK to profiles |
| title | TEXT | Book title (required) |
| author | TEXT | Book author (required) |
| cover_url | TEXT | Cover image URL |
| tags | TEXT[] | Category tags |
| status | TEXT | 'available' or 'swapped' |
| created_at | TIMESTAMPTZ | |

### swaps table
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key (auto) |
| book_id | UUID | FK to books |
| from_user_id | UUID | FK to profiles (original owner) |
| to_user_id | UUID | FK to profiles (new owner) |
| note | TEXT | Optional swap note |
| swapped_at | TIMESTAMPTZ | |

## Pages

| Route | Page | Auth Required | Description |
|-------|------|--------------|-------------|
| `/` | Browse | No | Search all available books across all users |
| `/user/:id` | UserShelf | No | View a specific user's bookshelf |
| `/my` | MyShelf | Yes | Manage my books (add/edit/delete) |
| `/my/add` | AddBook | Yes | Add a new book |
| `/my/edit/:id` | AddBook | Yes | Edit my book |
| `/swaps` | SwapHistory | Yes | View swap records |

## What to Remove from read-reflect

- `BookDetail.tsx` — note editing page (entire file)
- `MarkdownToolbar.tsx` — markdown toolbar (entire file)
- `Theme.tsx` — theme settings page
- All `notes` table references
- Supabase Auth (signUp, signIn, onAuthStateChange)
- `react-markdown`, `remark-gfm` dependencies
- `progress` field (未讀/閱讀中/已讀) → replaced by `status` (available/swapped)
- `rating` field — not needed for book swap
- `initialNote` in AddBook

## What to Keep from read-reflect

- React + Vite + TypeScript + shadcn/ui + Tailwind setup
- Supabase client (for database only, not auth)
- BookCard component (modified for swap context)
- Search/filter UI pattern
- Mobile-first responsive design
- Skeleton loaders
- Navigation component (modified routes)

## What to Add

- LetMeUse auth integration (SDK script tag + login flow)
- Public browse page (no login required to view books)
- User profile/shelf pages (public)
- Swap recording (select book → select recipient → create swap record)
- `profiles` table sync with LetMeUse user data

## Key Behaviors

1. **Public browsing**: Anyone can search and view all available books without logging in
2. **Login to manage**: LetMeUse login required to add/edit/delete your own books
3. **Simple swap flow**: Owner marks a book as "swapped" and records who received it
4. **Profile auto-creation**: First login creates a profile from LetMeUse user data
