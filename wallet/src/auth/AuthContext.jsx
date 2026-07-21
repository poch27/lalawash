import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('staff')) } catch { return null }
  })
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
  })

  function login(authUser, staffRecord) {
    sessionStorage.setItem('staff', JSON.stringify(staffRecord))
    sessionStorage.setItem('user', JSON.stringify(authUser))
    setStaff(staffRecord)
    setUser(authUser)
  }

  async function logout() {
    await supabase.auth.signOut().catch(() => {})
    sessionStorage.removeItem('staff')
    sessionStorage.removeItem('user')
    setStaff(null)
    setUser(null)
  }

  const value = {
    user,
    staff,
    loading: false,
    login,
    logout,
    isOwner: staff?.role === 'owner',
    isManager: staff?.role === 'manager',
    isStaff: !!staff,
    canVoid: staff?.role === 'owner' || staff?.role === 'manager',
    canViewSummary: staff?.role === 'owner' || staff?.role === 'manager',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
