import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetchWithoutAuth } from '../api/http'

export type Role =
  | 'ADMIN'
  | 'REGISTRATION_CLERK'
  | 'APPOINTMENT_CLERK'
  | 'DOCTOR'
  | 'CASHIER'

type LoginResponse = {
  token: string
  username: string
  roles: Role[]
}

type AuthState = {
  username: string | null
  roles: Role[]
}

type AuthContextValue = AuthState & {
  token: string | null
  login: (username: string, password: string) => Promise<LoginResponse>
  logout: () => void
  hasRole: (r: Role) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_TOKEN = 'token'
const STORAGE_USER = 'auth_user'

function loadStored(): AuthState & { token: string | null } {
  const token = localStorage.getItem(STORAGE_TOKEN)
  const raw = localStorage.getItem(STORAGE_USER)
  if (!token || !raw) {
    return { token: null, username: null, roles: [] }
  }
  try {
    const j = JSON.parse(raw) as { username: string; roles: Role[] }
    return { token, username: j.username, roles: j.roles ?? [] }
  } catch {
    return { token: null, username: null, roles: [] }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => loadStored(), [])
  const [token, setToken] = useState<string | null>(initial.token)
  const [username, setUsername] = useState<string | null>(initial.username)
  const [roles, setRoles] = useState<Role[]>(initial.roles)

  const login = useCallback(async (u: string, password: string) => {
    const body = await apiFetchWithoutAuth<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: u, password }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!body?.token) {
      throw new Error('Geçersiz yanıt')
    }
    localStorage.setItem(STORAGE_TOKEN, body.token)
    localStorage.setItem(
      STORAGE_USER,
      JSON.stringify({ username: body.username, roles: body.roles }),
    )
    setToken(body.token)
    setUsername(body.username)
    setRoles(body.roles)
    return body
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN)
    localStorage.removeItem(STORAGE_USER)
    setToken(null)
    setUsername(null)
    setRoles([])
  }, [])

  const hasRole = useCallback((r: Role) => roles.includes(r), [roles])

  const value = useMemo(
    () => ({
      token,
      username,
      roles,
      login,
      logout,
      hasRole,
    }),
    [token, username, roles, login, logout, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
