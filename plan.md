# Implementation Plan - Task Manager with Kibo UI Kanban

This plan describes the step-by-step approach to build the Task Manager application inside the current Next.js + turborepo workspace. The project will feature a full-stack Next.js app (`apps/web`) backed by a PostgreSQL database on Supabase (queried via Prisma) and a sleek Kanban-board UI using the Kibo UI Kanban component (customized with `@dnd-kit` and shadcn/ui).

---

## User Review Required

> [!IMPORTANT]
> **Next.js Version Constraints:** The workspace uses Next.js 16.2.6 (canary). As noted in `AGENTS.md` and the Next.js docs, this version handles React 19 canary and contains specific routing behaviors. We must ensure our code (especially hydration boundaries for the drag-and-drop context) aligns with these guidelines.
> 
> **Workspace Architecture:** We will integrate shadcn components and Kibo UI Kanban into the shared `@workspace/ui` package (`packages/ui`) to leverage the monorepo structure. This makes components reusable and keeps `apps/web` thin and focused.

---

## Open Questions

> [!NOTE]
> **Supabase / DB Setup:** Resolved. The user provided the client API keys and endpoint. We added placeholders for the PostgreSQL credentials in `apps/web/.env` and included manual SQL initialization scripts in the README.

---

## Proposed Changes

We will execute the implementation in phases:

### Phase 1: Prisma & Supabase Setup

Initialize and configure Prisma inside the web application:
- Add `prisma` as a devDependency and `@prisma/client` as a dependency in `apps/web`.
- Create `apps/web/prisma/schema.prisma` with the `Task` model and `Status` enum:
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
- Configure a `.env` file in `apps/web` with `DATABASE_URL` and `DIRECT_URL`.
- Generate Prisma Client and push the schema using `prisma db push`.

### Phase 2: Next.js API Route Handlers

Create a server-side API layer inside `apps/web` that interacts directly with the database:
- **Prisma Client Utility:** Create [db.ts](file:///d:/Projects/doinit/apps/web/lib/db.ts) to instantiate and share a single PrismaClient instance.
- **GET / POST Endpoint:** Create [route.ts](file:///d:/Projects/doinit/apps/web/app/api/tasks/route.ts) to:
  - `GET`: Retrieve all tasks sorted by creation date.
  - `POST`: Create a new task validating inputs with Zod.
- **PATCH / DELETE Endpoint:** Create [route.ts](file:///d:/Projects/doinit/apps/web/app/api/tasks/%5Bid%5D/route.ts) to:
  - `PATCH`: Update a task's fields (title, description, status).
  - `DELETE`: Remove a task by ID.

### Phase 3: Install UI Components & Dependencies

Configure styling and shadcn components inside the monorepo package `@workspace/ui`:
- Install drag-and-drop dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, and `tunnel-rat` in the `@workspace/ui` package.
- Install shadcn/ui components (`card`, `scroll-area`, `dialog`, `select`, `alert-dialog`, `badge`, `skeleton`, and `sonner` / `toast`) inside `@workspace/ui` using the shadcn CLI.

### Phase 4: Implement Kibo UI Kanban Component

Add Kibo UI's custom Kanban component to the monorepo:
- **Kanban Implementation:** Create [kanban.tsx](file:///d:/Projects/doinit/packages/ui/src/components/kanban.tsx) using the official Kibo UI source code extracted from the registry.
- **Build Configuration:** Export `./components/kanban` inside [package.json](file:///d:/Projects/doinit/packages/ui/packages/ui/package.json) so it can be imported as `@workspace/ui/components/kanban` in the Next.js app.
- **Hydration & SSR Safety:** Implement client-side mounting checks to prevent hydration mismatches caused by `@dnd-kit`'s portals.

### Phase 5: Front-end Kanban Page & Interactions

Replace the landing page with the Kanban Board UI:
- **Interactive Board Layout:** Modify [page.tsx](file:///d:/Projects/doinit/apps/web/app/page.tsx) to render a three-column Kanban board using `@workspace/ui/components/kanban` for columns: "To Do", "In Progress", and "Done".
- **Drag-and-Drop State:** Map DB Tasks to the Kanban cards structure. Implement optimistic UI state updates on drag-and-drop triggers, sending PATCH requests to update the status in the backend.
- **Create Task Form:** Implement an inline button or header button that triggers a `Dialog` modal to create tasks.
- **Update / Delete Actions:** Add dropdown controls and delete buttons on card hover, using `AlertDialog` for deletion confirmation.
- **Loading & Empty States:** Show Skeleton loaders during initial load and beautiful empty states when columns are empty. Add toast notifications for success/error feedback.

### Phase 6: Styling, Dark Mode & Responsiveness

Refine the application's look and feel:
- Apply clean typography (e.g. Outfit or custom Geist) and a premium Tailwind CSS theme.
- Ensure the board is fully responsive: columns should layout as side-by-side columns on desktop and collapse to a swipeable view or tab-bar selection on mobile screens.
- Support dark-mode toggling gracefully.

---

## Verification Plan

### Automated Verification
- Verify the TypeScript build across the workspace:
  ```bash
  pnpm run typecheck
  ```
- Build the production bundle to ensure no compile-time or routing errors:
  ```bash
  pnpm run build
  ```

### Manual Verification
1. Open the dev server and test creating tasks. Check that the new tasks appear instantly and exist in the database.
2. Drag tasks between columns and verify the database is updated (refreshing the page should keep the task in its new status).
3. Attempt to delete a task: verify the AlertDialog appears and cancelling preserves the card, while confirming deletes it.
4. Test mobile responsiveness using browser developer tools (shrink screen size to mobile width).
