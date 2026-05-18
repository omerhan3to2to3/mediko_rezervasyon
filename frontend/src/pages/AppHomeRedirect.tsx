import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from '../auth/AuthContext'

function target(roles: Role[]): string {
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

export function AppHomeRedirect() {
  const { token, roles } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <Navigate to={target(roles)} replace />
}
