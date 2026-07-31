"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface Toast {
  id: number
  message: string
  type: "success" | "error" | "info"
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-in fade-in slide-in-from-bottom-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
              t.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : t.type === "error"
                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-background border text-foreground"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
