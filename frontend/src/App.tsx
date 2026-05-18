import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { AppHomeRedirect } from './pages/AppHomeRedirect'
import { RegistrationPage } from './pages/RegistrationPage'
import { AppointmentPage } from './pages/AppointmentPage'
import { DoctorDayPage } from './pages/DoctorDayPage'
import { DoctorVisitPage } from './pages/DoctorVisitPage'
import { CashierPage } from './pages/CashierPage'
import { AdminPage } from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<Layout />}>
            <Route index element={<AppHomeRedirect />} />
            <Route path="yonetim" element={<AdminPage />} />
            <Route path="kayit" element={<RegistrationPage />} />
            <Route path="randevu" element={<AppointmentPage />} />
            <Route path="doktor" element={<DoctorDayPage />} />
            <Route path="doktor/ziyaret/:appointmentId" element={<DoctorVisitPage />} />
            <Route path="vezne" element={<CashierPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
