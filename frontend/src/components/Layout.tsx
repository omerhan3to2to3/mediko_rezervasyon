import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { token, username, logout, roles } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Get first letter of username for avatar
  const avatarLetter = username ? username.charAt(0).toUpperCase() : 'U'

  // Get readable role display
  const primaryRole = roles && roles.length > 0 ? roles[0] : ''
  const roleLabels: Record<string, string> = {
    ADMIN: 'Yönetici (Admin)',
    REGISTRATION_CLERK: 'Hasta Kayıt Sorumlusu',
    APPOINTMENT_CLERK: 'Randevu Görevlisi',
    DOCTOR: 'Poliklinik Doktoru',
    CASHIER: 'Vezne Sorumlusu'
  }
  const roleLabel = roleLabels[primaryRole] || 'Hastane Personeli'

  return (
    <div className="corporate-layout">
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

      <header className="corporate-header">
        <div className="corporate-brand">
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

        <div className="corporate-title">
          <span>HOSPITAL ENTERPRISE PORTAL</span>
        </div>

        <div className="corporate-user-box">
          <div className="user-profile">
            <div className="user-avatar">{avatarLetter}</div>
            <div className="user-info">
              <span className="user-name">{username}</span>
              <span className="user-role">{roleLabel}</span>
            </div>
          </div>
          <button type="button" className="btn-logout-header" onClick={logout} title="Güvenli Çıkış">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Çıkış</span>
          </button>
        </div>
      </header>

      <main className="corporate-container">
        <div className="workspace-card">
          <Outlet />
        </div>
        <footer className="corporate-footer">
          <p>© 2026 Şifa Sağlık Grubu. Tüm hakları saklıdır. | Güvenli Hastane Otomasyon Sistemi</p>
        </footer>
      </main>
    </div>
  )
}
