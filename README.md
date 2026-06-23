# doinit.

A modern, highly polished, real-time Kanban Task Manager built as part of the AWTOMATIG Full Stack Developer Intern Take-Home assignment. The application enables users to manage their daily workflows seamlessly by adding new tasks, viewing tasks organized in a dynamic three-column Kanban board, dragging and dropping tasks between columns to update their status (backed by optimistic UI rendering and real-time backend updates), and deleting tasks with secure confirmation modals.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend** | Next.js 16 (App Router) + TypeScript | Modern framework for robust type-safety, rapid rendering, and server-side utilities. |
| **Styling & UI** | Tailwind CSS + shadcn/ui + Kibo UI | Elegant, harmonized, and accessible component library with customizable drag-and-drop mechanics. |
| **Drag & Drop** | `@dnd-kit/core` & `@dnd-kit/sortable` | Robust, customizable, and accessible physics-based drag-and-drop primitives. |
| **Backend API** | Next.js Route Handlers (`app/api/tasks/...`) | Server-side endpoints running directly on the database to handle requests and return JSON. |
| **Database ORM** | Prisma | Clean, type-safe queries, migration automation, and schema declaration. |
| **Database** | PostgreSQL (Supabase) | Scalable, relational hosted database instance with native connection pooling support. |
| **Validation** | Zod | Schema-based backend validation. |

---

## Prerequisites

- **Node.js**: `>=20`
- **Package Manager**: `pnpm` (highly recommended, v10.x used in this monorepo)

---

## Setup Steps

Follow these simple steps to run the application locally:

### 1. Clone & Install Dependencies
Clone the repository, navigate into the project directory, and run the workspace installation:
```bash
pnpm install
```

### 2. Configure Environment Variables
Inside the `apps/web` directory, create a `.env` file (or rename and edit the existing one) with your database credentials and Supabase variables:
```env
# Database connection string for Supabase (Replace [YOUR-PASSWORD] with your actual database password)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.enlexomftqcyoxzwzndc.supabase.co:5432/postgres?schema=public"

# Supabase Client Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://enlexomftqcyoxzwzndc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_FyHSSU6YAOKVzqAbq3ZPxw_deddCL65
```

### 3. Initialize Database Schema
If you have connection credentials ready, you can push the schema automatically:
```bash
pnpm --filter web prisma db push
```

#### SQL Editor Fallback
If you do not have direct DB credentials configured but want to initialize your database manually, copy and execute this code in your **Supabase SQL Editor**:
```sql
-- Create Enum Type
CREATE TYPE "Status" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- Create Task Table
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- Enable RLS (Row Level Security)
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

-- Add permissive policies for public sandbox access
CREATE POLICY "Allow public read access" ON "Task" FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON "Task" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON "Task" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON "Task" FOR DELETE USING (true);
```

### 4. Run the Development Server
Run the monorepo dev command from the root directory:
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
| **POST** | `/api/tasks` | Creates a new task (Validates `title`, `description`, `status` with Zod). |
| **PATCH** | `/api/tasks/[id]` | Updates task fields (primarily status changes). |
| **DELETE** | `/api/tasks/[id]` | Deletes a task by ID. |

---

## Architecture & Design Decisions

- **Single Process Monorepo:** Next.js App Router Route Handlers (`app/api/...`) act as a clean, real server-side backend. This satisfies the requirement of a "real backend API connected to a frontend" without adding multi-process orchestration, CORS configurations, or complex environment setups for the reviewer.
- **Scope Decisions:**
  - **No Multi-User Auth:** Excluded authentication to guarantee a smooth, friction-free demo run for reviewers.
  - **Prisma Pg Adapter:** Configured to work seamlessly with Serverless and pooler architectures using modern driver adapters.
