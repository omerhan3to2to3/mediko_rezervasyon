import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isApiError } from '../api/http'
import { useAuth, type Role } from '../auth/AuthContext'

function defaultHome(roles: Role[]): string {
  const order: Role[] = ['ADMIN', 'REGISTRATION_CLERK', 'APPOINTMENT_CLERK', 'DOCTOR', 'CASHIER']
  for (const r of order) {
    if (roles.includes(r)) {
      if (r === 'ADMIN') return '/app/yonetim'
      if (r === 'REGISTRATION_CLERK') return '/app/kayit'
      if (r === 'APPOINTMENT_CLERK') return '/app/randevu'
      if (r === 'DOCTOR') return '/app/doktor'
      if (r === 'CASHIER') return '/app/vezne'
    }
  }
  return '/login'
}

export function LoginPage() {
  const { token, login, roles } = useAuth()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (token) {
    return <Navigate to={defaultHome(roles)} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const session = await login(username.trim(), password)
      nav(defaultHome(session.roles), { replace: true })
    } catch (err: unknown) {
      setError(isApiError(err) ? err.detail : 'Giriş başarısız')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card card">
        <div className="brand-inline">
          <span className="brand-mark sm" aria-hidden />
          <div>
            <h1>Şifa Polikliniği</h1>
            <p className="muted">Personel girişi</p>
          </div>
        </div>
        <form className="stack" onSubmit={onSubmit}>
          <label className="field">
            <span>Kullanıcı adı</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Şifre</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? 'Giriş yapılıyor…' : 'Giriş'}
          </button>
        </form>
        <div className="hint muted small">
          Demo (şifre <code>ChangeMe123!</code>): <strong>admin</strong>, <strong>kayit</strong>,{' '}
          <strong>randevu</strong>, <strong>vezne</strong>, <strong>dr.goz</strong>
        </div>
      </div>
    </div>
  )
}
