import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth, type Role } from '../auth/AuthContext'

const links: { to: string; label: string; role: Role }[] = [
  { to: '/app/yonetim', label: 'Üst yönetim', role: 'ADMIN' },
  { to: '/app/kayit', label: 'Hasta kayıt', role: 'REGISTRATION_CLERK' },
  { to: '/app/randevu', label: 'Randevu', role: 'APPOINTMENT_CLERK' },
  { to: '/app/doktor', label: 'Doktor paneli', role: 'DOCTOR' },
  { to: '/app/vezne', label: 'Vezne', role: 'CASHIER' },
]

export function Layout() {
  const { token, username, logout, hasRole } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <strong>Şifa Polikliniği</strong>
            <div className="muted small">Bilgi sistemi</div>
          </div>
        </div>
        <nav className="nav">
          {links
            .filter((l) => hasRole(l.role))
            .map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                {l.label}
              </NavLink>
            ))}
        </nav>
        <div className="user-box">
          <span className="muted small">{username}</span>
          <button type="button" className="btn ghost" onClick={logout}>
            Çıkış
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
