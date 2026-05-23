import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
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
      setError('Kullanıcı adı veya şifre yanlış.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login-wrap">
      {/* Background Watermark Elements */}
      <div className="watermark watermark-top-left" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="50" cy="50" r="44" strokeWidth="3" />
          <path d="M50 82s28-14 28-35V26l-28-10-28 10v21c0 21 28 35 28 35z" strokeWidth="3.5" />
          <path d="M50 76c0 0 22-11 22-29V31L50 22l-22 9v16c0 18 22 29 22 29z" strokeWidth="1.5" opacity="0.6" />
          <line x1="50" y1="28" x2="50" y2="72" strokeWidth="3.5" />
          <circle cx="50" cy="24" r="2.5" fill="currentColor" />
          <path d="M 38,33 C 38,28 62,28 62,38 C 62,45 38,44 38,51 C 38,58 62,57 62,64 C 62,70 42,69 44,73" strokeWidth="4" />
        </svg>
      </div>
      <div className="watermark watermark-bottom-right" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="50" cy="50" r="44" strokeWidth="3" />
          <path d="M50 82s28-14 28-35V26l-28-10-28 10v21c0 21 28 35 28 35z" strokeWidth="3.5" />
          <path d="M50 76c0 0 22-11 22-29V31L50 22l-22 9v16c0 18 22 29 22 29z" strokeWidth="1.5" opacity="0.6" />
          <line x1="50" y1="28" x2="50" y2="72" strokeWidth="3.5" />
          <circle cx="50" cy="24" r="2.5" fill="currentColor" />
          <path d="M 38,33 C 38,28 62,28 62,38 C 62,45 38,44 38,51 C 38,58 62,57 62,64 C 62,70 42,69 44,73" strokeWidth="4" />
        </svg>
      </div>

      <div className="login-card card">
        <div className="brand-inline">
          <div className="brand-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="logo-svg">
              <circle cx="50" cy="50" r="44" strokeWidth="4.5" />
              <path d="M50 82s28-14 28-35V26l-28-10-28 10v21c0 21 28 35 28 35z" strokeWidth="4.5" />
              <path d="M50 76c0 0 22-11 22-29V31L50 22l-22 9v16c0 18 22 29 22 29z" strokeWidth="1.8" opacity="0.7" />
              <line x1="50" y1="28" x2="50" y2="72" strokeWidth="4.5" />
              <circle cx="50" cy="24" r="2.5" fill="#ffffff" />
              <path d="M 38,33 C 38,28 62,28 62,38 C 62,45 38,44 38,51 C 38,58 62,57 62,64 C 62,70 42,69 44,73" strokeWidth="4.5" />
            </svg>
          </div>
          <div className="brand-text">
            <strong>ŞİFA</strong>
            <span>SAĞLIK GRUBU</span>
          </div>
        </div>
        
        <h2>Personel Girişi</h2>
        <p className="muted small" style={{ marginBottom: '1.5rem' }}>Lütfen sistem kimlik bilgilerinizi giriniz.</p>
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
          Demo (şifre <code>ChangeMe123!</code>): <strong>admin1</strong>, <strong>kayit1</strong>,{' '}
          <strong>randevu1</strong>, <strong>vezne1</strong>, <strong>dr1</strong>, <strong>dr2</strong>
        </div>
      </div>
    </div>
  )
}
