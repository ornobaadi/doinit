# [doinit.](https://doinit.vercel.app/)

A premium, modern Kanban-style task manager built as a personal playground to experiment with fluid drag-and-drop interfaces, custom styling, and modern full-stack patterns. The interface features a tailored dark/light aesthetic (Obsidian Midnight and Ice White) built on top of a custom, design-token-driven color palette.

## Key Highlights

- **Obsidian Midnight & Ice White Theme:** Harmonized colors defined in the OKLCH color space for depth, subtle contrast, and clean dark/light mode transitions.
- **Workflow Analytics:** A sleek dashboard banner showing real-time task volume ratios via a glowing completion progress bar.
- **Enhanced Micro-Interactions:** Physics-based drag-and-drop animations, card lift-up translations, collapsible details, and responsive scaling.
- **Contextual Empty States:** Custom SVG graphics occupying empty columns to provide visual structure and contextual actions instead of blank spaces.
- **Refined Typography:** Paired with `Plus Jakarta Sans` for soft, elegant UI elements and `JetBrains Mono` for metadata counters.

---

## Tech Stack

| Layer | Choice | Description |
|---|---|---|
| **Frontend** | Next.js (App Router) + TypeScript | Framework for robust type-safety and quick rendering. |
| **Styling & UI** | Tailwind CSS + shadcn/ui + Kibo UI | Accessible components with custom styling and drag-and-drop structures. |
| **Drag & Drop** | `@dnd-kit/core` & `@dnd-kit/sortable` | Physics-based drag-and-drop primitives. |
| **Backend API** | Next.js Route Handlers (`app/api/tasks/...`) | Server-side endpoints to process requests and manage data. |
| **Database ORM** | Prisma | Type-safe queries and database schema management. |
| **Database** | PostgreSQL | Relational database. |
| **Validation** | Zod | Schema-based data validation. |

---

## Prerequisites

- **Node.js**: `>=20`
- **Package Manager**: `pnpm` (monorepo workspace configuration)

---

## Setup Steps

### 1. Clone & Install Dependencies
Run the workspace installation from the root directory:
```bash
pnpm install
```

### 2. Configure Environment Variables
Create a `.env` file in the web application directory (`apps/web`) containing generic database connection URLs and client keys:
```env
# Database connection string
DATABASE_URL="postgresql://username:password@host:port/database"
DIRECT_URL="postgresql://username:password@host:port/database"

# Client environment variables
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

### 3. Initialize Database
Sync the database schema using Prisma:
```bash
pnpm --filter web prisma db push
```

### 4. Run the Development Server
Run the dev command from the root directory:
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Endpoints

All backend endpoints are standard REST routes returning JSON payloads:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/tasks` | Retrieves all tasks sorted chronologically. |
| **POST** | `/api/tasks` | Creates a new task. |
| **PATCH** | `/api/tasks/[id]` | Updates task fields (e.g. status, title, description). |
| **DELETE** | `/api/tasks/[id]` | Deletes a task by ID. |

---

## Architecture Decisions

- **Single Process App:** Leveraging Next.js Route Handlers (`app/api/...`) as the API layer keeps the database interaction server-side while keeping the project setup straightforward to build, run, and host.
- **Scope Decisions:**
  - **No Multi-User Auth:** Left out authentication to keep the task manager lightweight and focused purely on core board mechanics.
  - **Prisma Pg Adapter:** Configured to work seamlessly with serverless and pooler architectures using modern driver adapters.
