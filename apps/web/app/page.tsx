"use client"

import { useEffect, useRef, useState } from "react"
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
  CalendarBlank,
  Sun,
  Moon,
  Check,
  X as XIcon,
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
  { 
    id: "TODO", 
    name: "To-do",
    color: "bg-slate-400",
  },
  { 
    id: "IN_PROGRESS", 
    name: "In progress",
    color: "bg-amber-400",
  },
  { 
    id: "DONE", 
    name: "Done",
    color: "bg-emerald-400",
  },
]

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Add Task Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addTitle, setAddTitle] = useState("")
  const [addDescription, setAddDescription] = useState("")
  const [addStatus, setAddStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE">("TODO")
  const [submitting, setSubmitting] = useState(false)

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLTextAreaElement>(null)

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

  // Focus title input when edit mode starts
  useEffect(() => {
    if (editingId && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingId])

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

  // Handle Drag and Drop Updates
  const handleDataChange = async (newData: KanbanTaskItem[]) => {
    const changedItem = newData.find(item => {
      const original = tasks.find(t => t.id === item.id)
      return original && original.status !== item.column
    })

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

    if (changedItem) {
      try {
        const res = await fetch(`/api/tasks/${changedItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: changedItem.column })
        })
        if (!res.ok) throw new Error()
        const colName = COLUMNS.find(c => c.id === changedItem.column)?.name
        toast.success(`Moved to ${colName}`)
      } catch {
        toast.error("Failed to save. Reverting...")
        setTasks(oldTasks)
      }
    }
  }

  // Start inline edit
  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditDesc(task.description ?? "")
  }

  // Save inline edit
  const saveEdit = async () => {
    if (!editingId) return
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) {
      toast.error("Title cannot be empty")
      titleInputRef.current?.focus()
      return
    }

    const originalTask = tasks.find(t => t.id === editingId)
    if (!originalTask) return

    // No changes - just close
    if (trimmedTitle === originalTask.title && editDesc.trim() === (originalTask.description ?? "")) {
      setEditingId(null)
      return
    }

    setSavingEdit(true)
    const prevTasks = [...tasks]
    setTasks(prev => prev.map(t => t.id === editingId 
      ? { ...t, title: trimmedTitle, description: editDesc.trim() || null } 
      : t
    ))
    setEditingId(null)

    try {
      const res = await fetch(`/api/tasks/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, description: editDesc.trim() || null })
      })
      if (!res.ok) throw new Error()
      toast.success("Task updated")
    } catch {
      toast.error("Failed to save changes")
      setTasks(prevTasks)
    } finally {
      setSavingEdit(false)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  // Handle Direct Status Change
  const handleStatusChange = async (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask || originalTask.status === newStatus) return
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error()
      const colName = COLUMNS.find(c => c.id === newStatus)?.name
      toast.success(`Moved to ${colName}`)
    } catch {
      toast.error("Failed to update status. Reverting...")
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: originalTask.status } : t))
    }
  }

  // Handle Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addTitle.trim()) {
      toast.error("Task title is required")
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: addTitle, description: addDescription, status: addStatus })
      })
      if (!res.ok) throw new Error("Failed to create task")
      const newTask = await res.json()
      setTasks(prev => [newTask, ...prev])
      toast.success("Task created")
      setIsAddOpen(false)
      setAddTitle("")
      setAddDescription("")
      setAddStatus("TODO")
    } catch (err: any) {
      toast.error(err.message || "Failed to create task")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/tasks/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete task")
      setTasks(prev => prev.filter(t => t.id !== deleteId))
      toast.success("Task deleted")
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task")
    } finally {
      setDeleting(false)
    }
  }

  const getColCount = (colId: string) => tasks.filter(t => t.status === colId).length

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md px-5 py-3 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-base tracking-tighter shadow-sm">
            d
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-lg tracking-tight">
              doinit<span className="text-primary font-black">.</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Task counters */}
          <div className="hidden md:flex items-center gap-3 text-[11px] font-semibold text-muted-foreground mr-1 bg-muted/60 border border-border px-3 py-1.5 rounded-lg">
            <span>Todo <span className="text-foreground font-bold">{getColCount("TODO")}</span></span>
            <span className="size-1 rounded-full bg-border/80" />
            <span>Doing <span className="text-foreground font-bold">{getColCount("IN_PROGRESS")}</span></span>
            <span className="size-1 rounded-full bg-border/80" />
            <span>Done <span className="text-foreground font-bold">{getColCount("DONE")}</span></span>
          </div>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-lg size-8 hover:bg-muted border border-border/50 transition-all active:scale-95"
            title="Toggle theme"
          >
            {mounted ? (
              resolvedTheme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-violet-500" />
              )
            ) : (
              <span className="size-4" />
            )}
          </Button>

          {/* New Task button */}
          <Button 
            onClick={() => {
              setAddStatus("TODO")
              setIsAddOpen(true)
            }}
            className="rounded-lg gap-1.5 px-3.5 h-8 font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="size-3.5" weight="bold" /> New Task
          </Button>
        </div>
      </header>

      {/* Add Task Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border shadow-2xl bg-card border-border">
          <form onSubmit={handleAddTask} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold tracking-tight">New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <label htmlFor="add-title" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="add-title"
                  placeholder="What needs to be done?"
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary placeholder:text-muted-foreground/50"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="add-description" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  id="add-description"
                  placeholder="Add details (optional)..."
                  value={addDescription}
                  onChange={e => setAddDescription(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary placeholder:text-muted-foreground/50 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Column
                </label>
                <Select value={addStatus} onValueChange={(val: any) => setAddStatus(val)}>
                  <SelectTrigger className="w-full h-9 rounded-lg border border-border bg-background px-3">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border bg-card">
                    <SelectItem value="TODO" className="rounded-lg">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS" className="rounded-lg">In Progress</SelectItem>
                    <SelectItem value="DONE" className="rounded-lg">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-1 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="w-full sm:w-auto rounded-lg h-9"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto min-w-[90px] rounded-lg h-9 shadow-sm">
                {submitting ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main */}
      <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-5">
        <section className="flex-grow min-h-[500px] flex flex-col">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[480px]">
              {COLUMNS.map(col => (
                <div key={col.id} className="border border-border rounded-xl p-4 flex flex-col gap-3 bg-muted h-full">
                  <div className="flex justify-between items-center pb-2.5 border-b border-border">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-5 rounded-full" />
                  </div>
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center border border-dashed rounded-2xl p-12 text-center bg-destructive/5 max-w-lg mx-auto gap-4 mt-8 border-destructive/20">
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive size-12 flex items-center justify-center font-bold text-lg">!</div>
              <h2 className="font-bold text-lg tracking-tight">Connection Failed</h2>
              <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                Could not connect to the database. Verify environment variables and ensure Prisma is synced.
              </p>
              <Button onClick={fetchTasks} variant="outline" className="mt-1 rounded-lg h-9 border-destructive/30 hover:bg-destructive/10">
                Retry
              </Button>
            </div>
          ) : (
            <div className="h-[680px] select-none">
              <KanbanProvider<KanbanTaskItem>
                columns={kanbanColumns}
                data={kanbanData}
                onDataChange={handleDataChange}
                className="h-full gap-5 flex flex-col lg:flex-row"
              >
                {(column) => {
                  const colConfig = COLUMNS.find(c => c.id === column.id)!
                  const count = getColCount(column.id)

                  // Add Task button rendered inside the scroll area
                  const addTaskFooter = (
                    <button
                      type="button"
                      onClick={() => {
                        setAddStatus(column.id as any)
                        setIsAddOpen(true)
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-all active:scale-[0.98] cursor-pointer mt-1"
                    >
                      <Plus className="size-3.5 shrink-0" weight="bold" /> Add task
                    </button>
                  )

                  return (
                    <KanbanBoard 
                      id={column.id} 
                      className="h-full bg-muted border border-border shadow-sm flex flex-col rounded-xl"
                    >
                      {/* Column Header */}
                      <KanbanHeader className="flex justify-between items-center py-3 border-b border-border bg-muted/90 px-3.5 select-none rounded-t-xl">
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${colConfig.color} shrink-0`} />
                          <span className="font-bold text-foreground text-[13px] tracking-tight">
                            {column.name}
                          </span>
                          <Badge className="rounded-full border border-border font-bold px-1.5 py-0 text-[10px] font-mono bg-background text-muted-foreground shadow-none">
                            {count}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAddStatus(column.id as any)
                            setIsAddOpen(true)
                          }}
                          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-all flex items-center justify-center size-6 cursor-pointer"
                          title={`Add task to ${column.name}`}
                        >
                          <Plus className="size-3.5" weight="bold" />
                        </button>
                      </KanbanHeader>

                      {/* Cards */}
                      <KanbanCards<KanbanTaskItem> 
                        id={column.id} 
                        className="p-2.5 gap-2 flex-grow overflow-y-auto"
                        footer={addTaskFooter}
                      >
                        {(item) => {
                          const isEditing = editingId === item.id
                          const task = tasks.find(t => t.id === item.id)

                          return (
                            <KanbanCard<KanbanTaskItem> 
                              key={item.id} 
                              id={item.id} 
                              name={item.name} 
                              column={item.column}
                              description={item.description}
                              createdAt={item.createdAt}
                              className="group transition-all duration-150"
                            >
                              {isEditing ? (
                                /* ── Inline Edit Mode ── */
                                <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                    ref={titleInputRef}
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") { e.preventDefault(); descInputRef.current?.focus() }
                                      if (e.key === "Escape") cancelEdit()
                                    }}
                                    placeholder="Task title"
                                    className="w-full rounded-md border border-primary/60 bg-background px-2.5 py-1.5 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                  <textarea
                                    ref={descInputRef}
                                    value={editDesc}
                                    onChange={e => setEditDesc(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Escape") cancelEdit()
                                    }}
                                    placeholder="Description (optional)"
                                    rows={2}
                                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 resize-none text-muted-foreground"
                                  />
                                  <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                                    >
                                      <XIcon className="size-3" weight="bold" /> Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={saveEdit}
                                      disabled={savingEdit}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-60"
                                    >
                                      <Check className="size-3" weight="bold" /> Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* ── View Mode ── */
                                <div className="flex flex-col gap-2.5">
                                  {/* Title — click to edit */}
                                  <div className="flex items-start justify-between gap-2">
                                    <h3
                                      onClick={() => task && startEdit(task)}
                                      className="font-semibold text-[13px] leading-snug text-foreground cursor-text hover:text-primary transition-colors flex-1 min-w-0"
                                      title="Click to edit"
                                    >
                                      {item.name}
                                    </h3>
                                    {/* Delete */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDeleteId(item.id)
                                      }}
                                      className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center size-6 shrink-0 cursor-pointer"
                                      title="Delete task"
                                    >
                                      <Trash className="size-3.5" />
                                    </button>
                                  </div>

                                  {/* Description — click to edit */}
                                  {item.description ? (
                                    <p
                                      onClick={() => task && startEdit(task)}
                                      className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2 cursor-text hover:text-foreground/70 transition-colors"
                                      title="Click to edit"
                                    >
                                      {item.description as string}
                                    </p>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => task && startEdit(task)}
                                      className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground text-left transition-colors cursor-text"
                                    >
                                      + Add description
                                    </button>
                                  )}

                                  {/* Footer: date + status */}
                                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                    <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                                      <CalendarBlank className="size-3 shrink-0" />
                                      <span className="font-mono">{formatDate(item.createdAt as string)}</span>
                                    </div>
                                    <div className="flex items-center shrink-0" onClick={e => e.stopPropagation()}>
                                      <Select 
                                        value={item.column} 
                                        onValueChange={(val: any) => handleStatusChange(item.id, val)}
                                      >
                                        <SelectTrigger className="h-6 text-[10px] px-2 py-0 border border-border/60 bg-background hover:bg-muted rounded-md w-[7.5rem] shadow-none focus:ring-0 font-semibold">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border border-border bg-card">
                                          <SelectItem value="TODO" className="rounded-lg text-[11px]">To Do</SelectItem>
                                          <SelectItem value="IN_PROGRESS" className="rounded-lg text-[11px]">In Progress</SelectItem>
                                          <SelectItem value="DONE" className="rounded-lg text-[11px]">Done</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </KanbanCard>
                          )
                        }}
                      </KanbanCards>
                    </KanbanBoard>
                  )
                }}
              </KanbanProvider>
            </div>
          )}
        </section>
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl p-6 border shadow-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold tracking-tight">Delete Task</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              This will permanently delete the task. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel onClick={() => setDeleteId(null)} className="w-full sm:w-auto rounded-lg">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive" 
              onClick={handleDeleteTask} 
              disabled={deleting}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
