# PRD: Task Manager (AWTOMATIG Full Stack Intern Take-Home)

## 1. Context

This is a take-home assignment for the AWTOMATIG Full Stack Developer Intern role. The brief asks for a simple task manager: add, view, update status, and delete tasks. The frontend must be React/Next.js, connected to a real backend API (no hardcoded data), with a clear README.

The brief explicitly says "do not overthink it" and "keep it simple and functional." The goal of this PRD is to define a build that looks senior in execution (clean code, good UX, real API, proper docs) without inflating scope into something that misses the deadline or buries the core ask under unnecessary features. Polish should come from craft, not from feature or tool count.

**A deliberate architecture call:** the brief requires a frontend connected to a backend API, not a separate backend process. Next.js Route Handlers (`app/api/.../route.ts`) are a real backend API layer: they run server-side, hit the database directly, and return JSON over HTTP. The frontend calls them exactly as it would call any external API. Adding a second Express server in the same repo would mean two `package.json` files, two `.env` files, CORS configuration, and two processes to run side by side, none of which adds capability at this scope, and all of which adds setup steps a reviewer has to get right just to see the app run. A single Next.js app keeps the "real backend, no hardcoded data" requirement fully intact while removing avoidable risk before a tight deadline. Prisma is kept despite the small schema because it pays for itself immediately in query clarity and type safety, which is exactly what the brief says it's grading for.

**Deadline:** June 24, 2026, 12:00 AM.

## 2. Goals

- Satisfy every literal requirement in the brief, with nothing missing and nothing hardcoded.
- Make the code easy for a reviewer to read in one pass: clear file structure, descriptive names, no cleverness for its own sake.
- Make the UI feel like a real product, not a CRUD scaffold, using shadcn/ui components with intentional layout and interaction details.
- Ship a README that lets the reviewer run the project in under two minutes with zero guesswork.
- Stay inside a scope that's realistically finishable solo before the deadline.

## 3. Non-Goals

- No user authentication or multi-user support. The brief doesn't ask for it, and adding it raises the risk of the demo breaking on review.
- No deployment requirement (live link is explicitly optional). Attempt it only after the core flow is solid and tested locally.
- No task assignment, comments, attachments, due dates, or other PM-tool features beyond what's asked. Extra fields are fine if cheap (see 6.3); extra subsystems are not.
- No test suite. Not asked for, and writing tests eats time better spent on UI polish and README clarity for a task this size.

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | Matches the brief's stated stack, matches your existing workflow |
| UI components | shadcn/ui + Tailwind CSS | Polished, accessible components without hand-rolling design |
| Backend API | Next.js Route Handlers (`app/api/tasks/route.ts`) | Real server-side API layer, satisfies "connected to a backend API" without the overhead of a second process, second `.env`, or CORS setup |
| ORM | Prisma | Type-safe queries, fast schema iteration, clean migration story for the README |
| Database | PostgreSQL via Supabase | Matches your usual stack, free hosted instance, no local Postgres install needed for you or the reviewer |
| Validation | Zod | Cheap to add, signals care about data integrity |

Single repo, single Next.js app. No `/client` and `/server` split, no second runtime. The API boundary is real (frontend code calls `fetch('/api/tasks')`, which hits a server-side handler that queries Postgres through Prisma), it's just not a separate process. This keeps the entire project to one `npm install` and one `npm run dev` for the reviewer.

## 5. User Flows

1. **View tasks:** Land on the page, see all tasks grouped or filterable by status. Empty state shown if no tasks exist yet.
2. **Add a task:** Open a form (modal or inline), enter title (required), description (optional), pick initial status (defaults to "To Do"). Submit creates it via API and it appears in the list without a page reload.
3. **Update status:** Change a task's status directly from the list (dropdown or drag-style select, not a separate edit page) for the fastest possible interaction.
4. **Delete a task:** Remove a task with a confirmation step to avoid accidental deletes.

All four flows hit real API endpoints. No optimistic-only state that fakes a save.

## 6. Functional Requirements

### 6.1 Data Model

```prisma
model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      Status   @default(TODO)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Status {
  TODO
  IN_PROGRESS
  DONE
}
```

### 6.2 API Endpoints (Next.js Route Handlers)

| Method | Route | File | Purpose |
|---|---|---|---|
| GET | `/api/tasks` | `app/api/tasks/route.ts` | List all tasks |
| POST | `/api/tasks` | `app/api/tasks/route.ts` | Create a task |
| PATCH | `/api/tasks/:id` | `app/api/tasks/[id]/route.ts` | Update a task (status, or full edit) |
| DELETE | `/api/tasks/:id` | `app/api/tasks/[id]/route.ts` | Delete a task |

Standard REST, JSON in/out, proper status codes (200/201/204/400/404/500). No CORS configuration needed since frontend and API live in the same Next.js app and origin. Errors return a consistent `{ error: string }` shape so the frontend can show real error states instead of failing silently.

### 6.3 Cheap, Worthwhile Extras

These are low-cost additions that elevate the submission without expanding scope meaningfully:

- **Loading and error states** in the UI (skeleton or spinner while fetching, a visible error message if the API call fails). This alone separates a take-home from a tutorial project.
- **Optimistic UI updates** for status changes, reconciled with the server response. Feels fast, still backed by a real API call.
- **Status badges with color coding** (e.g. neutral for To Do, blue for In Progress, green for Done) using shadcn's `Badge` component.
- **Task count per status** shown as a small header stat or column count if using a board layout.
- **Toast notifications** (shadcn `sonner` or `toast`) on create/update/delete success and failure.
- **Delete confirmation** via shadcn `AlertDialog`, not a raw `window.confirm`.

None of these require new backend concepts. They're presentation and resilience, which is exactly where "polish" should be spent for a brief this size.

## 7. UI / Design Direction

- **Visual Theme:** Premium Obsidian theme governed by the MASTER.md design system. Focuses on an Ice White theme for light mode and Obsidian Midnight theme for dark mode, using custom OKLCH color definitions.
- **Accent Palette:** Electric Violet (`oklch(0.60 0.21 280)`) for active controls, hover-lifts, and focus markers. To-Do tasks are styled in soft slate-gray, In-Progress in warm amber, and Done in vibrant emerald.
- **Layout & Ratio-bar:** A three-column grid layout (To Do / In Progress / Done). Complemented by a dashboard analytics widget displaying task volume ratios via a glowing completion progress bar.
- **Typography:** `Plus Jakarta Sans` for primary typography to provide soft edges and high visual clarity. `JetBrains Mono` for metadata chips and numeric counts.
- **Animations & Empty States:** Subtle micro-animations (hover transitions, card lift scales, drop indicators). Empty columns are occupied by unique SVG graphics offering contextual actions instead of blank voids.


## 8. README Requirements

The README must include, in this order:

1. One-paragraph project description.
2. Tech stack list.
3. Prerequisites (Node version, etc.).
4. Setup steps: clone, install, set `DATABASE_URL` env var (Supabase connection string), `npx prisma db push`, run dev server (`npm run dev`).
5. API endpoint table (mirrors section 6.2).
6. Any known limitations or things explicitly left out, framed as deliberate scope decisions, not omissions. This is a small but real signal of judgment to the reviewer, and is also where you can briefly note the choice of Route Handlers over a separate backend process, in one sentence, in case the reviewer wonders about it.

## 9. Build Plan / Sequencing

1. Scaffold Next.js app, set up Prisma schema, push to Supabase, confirm DB connection.
2. Build and test all four API route handlers with a REST client (Thunder Client, Postman, or curl) before touching the UI.
3. Install shadcn, build the static UI with mock data first to nail the layout fast.
4. Wire the frontend to the real API routes, replacing mock data entirely.
5. Add loading/error states, toasts, delete confirmation.
6. Write the README.
7. Final pass: re-read all code once as if reviewing someone else's PR; rename anything unclear, remove dead code/console.logs.
8. Optional: deploy to Vercel (one click, since it's all one Next.js app) only if steps 1 to 7 are done with time to spare.

## 10. Definition of Done

- All four CRUD operations work end-to-end against the real database, verified by refreshing the page after each action.
- No hardcoded or mock data remains in the shipped frontend.
- README lets a stranger run the project from a clean clone in under two minutes.
- Code has been read once, top to bottom, by you, specifically checking "could I explain any line of this if asked in an interview."
- Submission email sent to awtomatig@gmail.com with subject `Full Stack Intern Task - Abu Jafar Md. Fajlay Rabby`, GitHub repo link included, live link included only if it's actually working.
