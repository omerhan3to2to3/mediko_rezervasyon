import { Navigate } from 'react-router-dom'
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

export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { hasRole, roles } = useAuth()
  if (!hasRole(role)) {
    return <Navigate to={defaultHome(roles)} replace />
  }
  return <>{children}</>
}
