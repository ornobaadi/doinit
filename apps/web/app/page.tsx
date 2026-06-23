"use client"

import { useEffect, useState } from "react"
import { 
  KanbanProvider, 
  KanbanBoard, 
  KanbanHeader, 
  KanbanCards, 
  KanbanCard 
} from "@workspace/ui/components/kanban"
import { Button } from "@workspace/ui/components/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from "@workspace/ui/components/dialog"
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@workspace/ui/components/select"
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "sonner"
import { 
  Plus, 
  Trash, 
  CheckCircle, 
  PlayCircle, 
  Circle, 
  CalendarBlank,
  Note,
  Sun,
  Moon,
  Clock
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"

interface Task {
  id: string
  title: string
  description: string | null
  status: "TODO" | "IN_PROGRESS" | "DONE"
  createdAt: string
  updatedAt: string
}

type KanbanTaskItem = {
  id: string
  name: string
  column: string
  description: string | null
  createdAt: string
} & Record<string, unknown>

const COLUMNS = [
  { id: "TODO", name: "To Do", color: "border-t-neutral-400 dark:border-t-neutral-600", bg: "bg-neutral-500/5", icon: Circle },
  { id: "IN_PROGRESS", name: "In Progress", color: "border-t-amber-500", bg: "bg-amber-500/5", icon: PlayCircle },
  { id: "DONE", name: "Done", color: "border-t-emerald-500", bg: "bg-emerald-500/5", icon: CheckCircle },
]

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Add Task Form State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE">("TODO")
  const [submitting, setSubmitting] = useState(false)

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { resolvedTheme, setTheme } = useTheme()

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tasks")
      if (!res.ok) throw new Error("Failed to load tasks")
      const data = await res.json()
      setTasks(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
      toast.error("Could not fetch tasks from server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchTasks()
  }, [])

  // Map tasks to Kibo UI Kanban item format
  const kanbanData: KanbanTaskItem[] = tasks.map(task => ({
    id: task.id,
    name: task.title,
    column: task.status,
    description: task.description,
    createdAt: task.createdAt
  }))

  const kanbanColumns = COLUMNS.map(col => ({
    id: col.id,
    name: col.name
  }))

  // Handle Drag and Drop Updates (Optimistic UI)
  const handleDataChange = async (newData: KanbanTaskItem[]) => {
    // 1. Identify which task has changed column
    const changedItem = newData.find(item => {
      const original = tasks.find(t => t.id === item.id)
      return original && original.status !== item.column
    })

    // 2. Perform optimistic update of local state
    const oldTasks = [...tasks]
    const updatedTasks = newData.map(item => {
      const original = tasks.find(t => t.id === item.id)
      return {
        id: item.id,
        title: item.name,
        status: item.column,
        description: item.description,
        createdAt: item.createdAt,
        updatedAt: original ? original.updatedAt : new Date().toISOString()
      } as Task
    })
    setTasks(updatedTasks)

    // 3. Make patch request if status changed
    if (changedItem) {
      try {
        const res = await fetch(`/api/tasks/${changedItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: changedItem.column })
        })
        if (!res.ok) throw new Error()
        
        const colName = COLUMNS.find(c => c.id === changedItem.column)?.name
        toast.success(`Moved "${changedItem.name}" to ${colName}`)
      } catch (err) {
        toast.error("Failed to save drag position. Reverting...")
        setTasks(oldTasks)
      }
    }
  }

  // Handle Direct Status Change via Dropdown in card
  const handleStatusChange = async (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask || originalTask.status === newStatus) return

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error()
      
      const colName = COLUMNS.find(c => c.id === newStatus)?.name
      toast.success(`Moved "${originalTask.title}" to ${colName}`)
    } catch (err) {
      toast.error("Failed to update status. Reverting...")
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: originalTask.status } : t))
    }
  }

  // Handle Add Task Submission
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Task title is required")
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, status })
      })
      if (!res.ok) throw new Error("Failed to create task")
      const newTask = await res.json()
      
      setTasks(prev => [newTask, ...prev])
      toast.success("Task created successfully")
      setIsAddOpen(false)
      setTitle("")
      setDescription("")
      setStatus("TODO")
    } catch (err: any) {
      toast.error(err.message || "Failed to create task")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Confirmation
  const handleDeleteTask = async () => {
    if (!deleteId) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/tasks/${deleteId}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete task")
      
      setTasks(prev => prev.filter(t => t.id !== deleteId))
      toast.success("Task deleted successfully")
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task")
    } finally {
      setDeleting(false)
    }
  }

  // Task Column Stats
  const getColCount = (colId: string) => tasks.filter(t => t.status === colId).length

  // Date Formatter Helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      
      {/* Sleek Top Header Navigation */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md px-6 py-4 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md font-bold text-lg">
            d
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text">
            doinit.
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark Mode toggle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-full size-9 hover:bg-muted"
            title="Toggle theme"
          >
            {mounted ? (
              resolvedTheme === "dark" ? (
                <Sun className="size-[1.1rem]" />
              ) : (
                <Moon className="size-[1.1rem]" />
              )
            ) : (
              <span className="size-[1.1rem]" />
            )}
          </Button>

          {/* Add Task Trigger Modal */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button className="rounded-full shadow-md gap-1 px-4 h-9 font-medium text-xs md:text-sm" />}>
              <Plus className="size-4 stroke-[3px]" /> Add Task
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-xl p-6 border shadow-2xl bg-card">
              <form onSubmit={handleAddTask} className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Task Title *
                    </label>
                    <input
                      id="title"
                      placeholder="e.g. Design Kanban Board UI"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Description
                    </label>
                    <textarea
                      id="description"
                      placeholder="Enter details about this task..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Initial Status
                    </label>
                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="pt-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto min-w-[80px]">
                    {submitting ? "Creating..." : "Save Task"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col gap-8">
        
        {/* Dynamic Board Stats & Header Summary */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border/80 bg-muted/40 rounded-2xl p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Workspace Board</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Visualize workflow, track progress, and manage tasks seamlessly.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {COLUMNS.map(col => {
              const Icon = col.icon
              return (
                <div 
                  key={col.id}
                  className="flex items-center gap-2 border bg-card rounded-xl px-4 py-2 text-xs font-semibold shadow-xs"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{col.name}</span>
                  <Badge variant="secondary" className="rounded-full h-5 min-w-5 justify-center font-bold px-1 text-xs">
                    {getColCount(col.id)}
                  </Badge>
                </div>
              )
            })}
          </div>
        </section>

        {/* Kanban Board Container */}
        <section className="flex-grow min-h-[500px]">
          {loading ? (
            /* Loading Skeletons for the Kanban Columns and Cards */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[450px]">
              {COLUMNS.map(col => (
                <div key={col.id} className="border rounded-xl p-4 flex flex-col gap-4 bg-muted/20">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-5 w-6 rounded-full" />
                  </div>
                  <Skeleton className="h-[120px] w-full rounded-lg" />
                  <Skeleton className="h-[90px] w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error Display Component */
            <div className="flex flex-col items-center justify-center border border-dashed rounded-2xl p-12 text-center bg-destructive/5 max-w-lg mx-auto gap-4 mt-12">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive size-12 flex items-center justify-center font-bold text-lg">
                !
              </div>
              <h2 className="font-bold text-lg">Failed to connect to database</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Ensure your Supabase connection string is correct and you have run migrations in the .env file.
              </p>
              <Button onClick={fetchTasks} variant="outline" className="mt-2">
                Retry Connection
              </Button>
            </div>
          ) : (
            /* Actual Interactive Kibo UI Kanban Board */
            <div className="h-[600px] select-none">
              <KanbanProvider<KanbanTaskItem>
                columns={kanbanColumns}
                data={kanbanData}
                onDataChange={handleDataChange}
                className="h-full gap-6"
              >
                {(column) => {
                  const colConfig = COLUMNS.find(c => c.id === column.id)!
                  const count = getColCount(column.id)
                  const Icon = colConfig.icon

                  return (
                    <KanbanBoard 
                      id={column.id} 
                      className={`h-full border-t-4 ${colConfig.color} rounded-xl bg-muted/30 border-x border-b shadow-xs`}
                    >
                      {/* Column Header */}
                      <KanbanHeader className="flex justify-between items-center py-3 border-b bg-card rounded-t-xl px-4 select-none">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="font-bold text-foreground text-sm tracking-wide">
                            {column.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="rounded-full font-bold size-5 justify-center p-0 text-[10px]">
                          {count}
                        </Badge>
                      </KanbanHeader>

                      {/* Cards List Scroller */}
                      <KanbanCards<KanbanTaskItem> id={column.id} className="p-3 gap-3 flex-grow overflow-y-auto">
                        {(item) => (
                          <KanbanCard<KanbanTaskItem> 
                            key={item.id} 
                            id={item.id} 
                            name={item.name} 
                            column={item.column}
                            description={item.description}
                            createdAt={item.createdAt}
                            className="bg-card shadow-xs group"
                          >
                            <div className="flex flex-col gap-2.5">
                              {/* Card Title & Delete Action */}
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-sm leading-snug tracking-tight text-foreground select-none">
                                  {item.name}
                                </h3>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteId(item.id)
                                  }}
                                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded transition-colors flex items-center justify-center size-6 outline-none"
                                  title="Delete Task"
                                >
                                  <Trash className="size-3.5" />
                                </button>
                              </div>

                              {/* Card Description */}
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                  {item.description as string}
                                </p>
                              )}

                              {/* Card Footer: Metadata and Status Dropdown */}
                              <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <CalendarBlank className="size-3 text-muted-foreground/80" />
                                  <span>{formatDate(item.createdAt as string)}</span>
                                </div>

                                <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                  <Select 
                                    value={item.column} 
                                    onValueChange={(val: any) => handleStatusChange(item.id, val)}
                                  >
                                    <SelectTrigger className="h-6 text-[10px] px-2 py-0 border-none bg-transparent hover:bg-muted rounded w-24 shadow-none focus:ring-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="TODO">To Do</SelectItem>
                                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      <SelectItem value="DONE">Done</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </KanbanCard>
                        )}
                      </KanbanCards>

                      {/* Empty Column Indicator */}
                      {count === 0 && (
                        <div className="flex flex-col items-center justify-center flex-grow py-8 text-center text-muted-foreground select-none px-4 gap-2">
                          <Note className="size-8 stroke-[1px] opacity-40" />
                          <p className="text-xs font-medium opacity-65">Empty column</p>
                        </div>
                      )}
                    </KanbanBoard>
                  )
                }}
              </KanbanProvider>
            </div>
          )}
        </section>
      </main>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm rounded-xl p-6 border shadow-2xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Task</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel onClick={() => setDeleteId(null)} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive" 
              onClick={handleDeleteTask} 
              disabled={deleting}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
