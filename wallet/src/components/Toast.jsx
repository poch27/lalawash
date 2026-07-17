import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, duration = 3000) => {
    setToast(message)
    setTimeout(() => setToast(null), duration)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <div className="toast">{toast}</div>}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
