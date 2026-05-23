import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RequireRole } from '../components/RequireRole'
import { apiFetch } from '../api/http'

type Appointment = {
  id: number
  patientId: number
  patientName: string
  doctorId: number
  doctorName: string
  clinicId: number
  clinicName: string
  startAt: string
  endAt: string
  status: string
}

export function DoctorDayPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<Appointment[]>([])

  useEffect(() => {
    apiFetch<Appointment[]>(`/api/doctor/appointments?date=${encodeURIComponent(date)}`)
      .then((r) => setRows(r ?? []))
      .catch(() => setRows([]))
  }, [date])

  return (
    <RequireRole role="DOCTOR">
      <div className="page">
        <h2>Günün randevuları</h2>
        <div className="row wrap">
          <label className="field flex">
            <span>Tarih</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div className="table-wrap mt">
          <table className="table">
            <thead>
              <tr>
                <th>Saat</th>
                <th>Hasta</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.startAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    {a.patientName}{' '}
                    <span className="muted small">(ID {a.patientId})</span>
                  </td>
                  <td>
                    <span
                      className={`pill ${
                        a.status === 'SCHEDULED'
                          ? 'ok'
                          : a.status === 'COMPLETED'
                          ? 'subtle'
                          : 'warn'
                      }`}
                    >
                      {a.status === 'SCHEDULED'
                        ? 'Muayene Bekliyor'
                        : a.status === 'COMPLETED'
                        ? 'Muayene Edildi'
                        : 'İptal Edildi'}
                    </span>
                  </td>
                  <td className="right">
                    <Link className="btn tiny primary" to={`/app/doktor/ziyaret/${a.id}`}>
                      Muayene Ekranı
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Randevu yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RequireRole>
  )
}
