import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { User } from "../types"
import { fetchUser } from "../api"

interface AuthState {
  user: User | null
  loading: boolean
  clearUser: () => void
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, clearUser: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
      .then((u) => {
        if (u.logged_in) setUser(u)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const clearUser = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, loading, clearUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
