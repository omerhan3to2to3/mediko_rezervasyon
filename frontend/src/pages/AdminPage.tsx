import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { RequireRole } from '../components/RequireRole'
import { apiFetch, isApiError } from '../api/http'
import type { Role } from '../auth/AuthContext'

type Clinic = { id: number; name: string; active: boolean }
type AdminUser = {
  id: number
  username: string
  roles: string[]
  doctorId: number | null
  clinicId: number | null
  clinicName: string | null
  doctorFullName: string | null
}

const assignableRoles: Role[] = ['REGISTRATION_CLERK', 'APPOINTMENT_CLERK', 'CASHIER', 'DOCTOR']
const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const roleLabels: Record<Role, string> = {
  ADMIN: 'Üst Yönetim',
  REGISTRATION_CLERK: 'Kayıt Görevlisi',
  APPOINTMENT_CLERK: 'Randevu Görevlisi',
  CASHIER: 'Veznedar',
  DOCTOR: 'Doktor',
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | ''>('')
  const [clinicId, setClinicId] = useState<number | ''>('')
  const [doctorFullName, setDoctorFullName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [newClinicName, setNewClinicName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState<Role | ''>('')
  const [editClinicId, setEditClinicId] = useState<number | ''>('')
  const [editDoctorName, setEditDoctorName] = useState('')
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10))

  const hasDoctorRole = useMemo(() => selectedRole === 'DOCTOR', [selectedRole])

  async function loadData() {
    const [u, c] = await Promise.all([
      apiFetch<AdminUser[]>('/api/admin/users'),
      apiFetch<Clinic[]>('/api/admin/clinics'),
    ])
    setUsers(u ?? [])
    setClinics(c ?? [])
  }

  useEffect(() => {
    loadData().catch(() => undefined)
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (selectedRole === '') {
      setMsg('Bir rol seçmelisiniz.')
      return
    }
    if (hasDoctorRole && clinicId === '') {
      setMsg('Doktor rolü için klinik seçimi zorunludur.')
      return
    }
    setPending(true)
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
          roles: [selectedRole],
          clinicId: hasDoctorRole ? clinicId : undefined,
          doctorFullName: hasDoctorRole ? doctorFullName.trim() || undefined : undefined,
        }),
      })
      setMsg('Kullanıcı oluşturuldu.')
      setUsername('')
      setPassword('')
      setSelectedRole('')
      setClinicId('')
      setDoctorFullName('')
      await loadData()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Kullanıcı oluşturulamadı')
    } finally {
      setPending(false)
    }
  }

  async function createClinic(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    try {
      await apiFetch('/api/admin/clinics', {
        method: 'POST',
        body: JSON.stringify({ name: newClinicName.trim() }),
      })
      setNewClinicName('')
      setMsg('Yeni klinik eklendi.')
      await loadData()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Klinik eklenemedi')
    }
  }

  function startEdit(u: AdminUser) {
    const role = (u.roles[0] ?? '') as Role | ''
    setEditingId(u.id)
    setEditUsername(u.username)
    setEditPassword('')
    setEditRole(role)
    setEditClinicId(u.clinicId ?? '')
    setEditDoctorName(u.doctorFullName ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditUsername('')
    setEditPassword('')
    setEditRole('')
    setEditClinicId('')
    setEditDoctorName('')
  }

  async function saveEdit(userId: number) {
    setMsg(null)
    if (editRole === '') {
      setMsg('Bir rol seçmelisiniz.')
      return
    }
    if (editRole === 'DOCTOR' && editClinicId === '') {
      setMsg('Doktor rolü için klinik seçimi zorunludur.')
      return
    }
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: editUsername.trim(),
          password: editPassword.trim() || undefined,
          roles: [editRole],
          clinicId: editRole === 'DOCTOR' ? editClinicId : undefined,
          doctorFullName: editRole === 'DOCTOR' ? editDoctorName.trim() || undefined : undefined,
        }),
      })
      setMsg('Kullanıcı güncellendi.')
      cancelEdit()
      await loadData()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Kullanıcı güncellenemedi')
    }
  }

  async function deleteUser(userId: number, usernameText: string) {
    if (!confirm(`"${usernameText}" kullanıcısını silmek istiyor musunuz?`)) return
    setMsg(null)
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      setMsg('Kullanıcı silindi.')
      if (editingId === userId) cancelEdit()
      await loadData()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Kullanıcı silinemedi')
    }
  }

  async function downloadReport(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const token = localStorage.getItem('token')
    if (!token) {
      setMsg('Oturum bulunamadi.')
      return
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/reports/appointments?period=${reportPeriod}&date=${encodeURIComponent(reportDate)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        const txt = await res.text()
        setMsg(txt || 'Rapor indirilemedi')
        return
      }
      const blob = await res.blob()
      const filename = `randevu-raporu-${reportPeriod}-${reportDate}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setMsg('PDF rapor indirildi.')
    } catch {
      setMsg('Rapor indirilemedi')
    }
  }

  return (
    <RequireRole role="ADMIN">
      <div className="page">
        <h2>Üst yönetim</h2>
        <p className="muted">Yeni kullanıcı ekleyin, rol atayın; doktor için klinik seçin.</p>

        <form className="card stack" onSubmit={onSubmit}>
          <h3>Kullanıcı oluştur</h3>
          <div className="row wrap">
            <label className="field flex">
              <span>Kullanıcı adı</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label className="field flex">
              <span>Şifre</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
          </div>

          <div className="stack">
            <span className="muted small">Rol (tek seçim)</span>
            <div className="row wrap">
              {assignableRoles.map((r) => (
                <label key={r} className="pill">
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === r}
                    onChange={() => setSelectedRole(r)}
                    style={{ marginRight: 6 }}
                  />
                  {roleLabels[r]}
                </label>
              ))}
            </div>
          </div>

          {hasDoctorRole && (
            <div className="row wrap">
              <label className="field flex">
                <span>Klinik (doktor alanı)</span>
                <select
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Seçin</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field flex">
                <span>Doktor görünen adı (opsiyonel)</span>
                <input
                  value={doctorFullName}
                  onChange={(e) => setDoctorFullName(e.target.value)}
                  placeholder="Dr. Ad Soyad"
                />
              </label>
            </div>
          )}

          {msg && <div className="alert subtle">{msg}</div>}
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? 'Kaydediliyor…' : 'Kullanıcı oluştur'}
          </button>
        </form>

        <form className="card stack mt" onSubmit={createClinic}>
          <h3>Yeni klinik aç</h3>
          <div className="row wrap">
            <label className="field flex">
              <span>Klinik adı</span>
              <input
                value={newClinicName}
                onChange={(e) => setNewClinicName(e.target.value)}
                placeholder="Örn: Dahiliye"
                required
              />
            </label>
            <button className="btn secondary" type="submit">
              Klinik ekle
            </button>
          </div>
        </form>

        <form className="card stack mt" onSubmit={downloadReport}>
          <h3>Randevu raporu (PDF)</h3>
          <div className="row wrap">
            <label className="field">
              <span>Periyot</span>
              <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}>
                <option value="daily">Günlük</option>
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </label>
            <label className="field">
              <span>Referans tarih</span>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </label>
            <button className="btn secondary" type="submit">
              PDF indir
            </button>
          </div>
          <div className="muted small">
            Rapor; randevu, hasta-doktor eşleşmesi, bulgular/tedavi, dokümanlar ve ödeme durumunu içerir.
          </div>
        </form>

        <div className="card stack mt">
          <h3>Mevcut kullanıcılar</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Roller</th>
                  <th>Doktor/Klinik</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {editingId === u.id ? (
                        <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                      ) : (
                        u.username
                      )}
                    </td>
                    <td>
                      {editingId === u.id ? (
                        <select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
                          <option value="">Seçin</option>
                          {assignableRoles.map((r) => (
                            <option key={r} value={r}>
                              {roleLabels[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        u.roles.map((r) => roleLabels[r as Role] ?? r).join(', ')
                      )}
                    </td>
                    <td>
                      {editingId === u.id ? (
                        <div className="stack">
                          {editRole === 'DOCTOR' ? (
                            <>
                              <select
                                value={editClinicId}
                                onChange={(e) =>
                                  setEditClinicId(e.target.value ? Number(e.target.value) : '')
                                }
                              >
                                <option value="">Klinik seçin</option>
                                {clinics.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={editDoctorName}
                                onChange={(e) => setEditDoctorName(e.target.value)}
                                placeholder="Dr. Ad Soyad"
                              />
                            </>
                          ) : (
                            <span className="muted">-</span>
                          )}
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Yeni şifre (opsiyonel)"
                            minLength={8}
                          />
                        </div>
                      ) : u.doctorId ? (
                        `${u.doctorFullName} (${u.clinicName})`
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="row wrap">
                      {editingId === u.id ? (
                        <>
                          <button type="button" className="btn tiny primary" onClick={() => void saveEdit(u.id)}>
                            Kaydet
                          </button>
                          <button type="button" className="btn tiny ghost" onClick={cancelEdit}>
                            Vazgeç
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn tiny ghost" onClick={() => startEdit(u)}>
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className="btn tiny"
                            onClick={() => void deleteUser(u.id, u.username)}
                          >
                            Sil
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RequireRole>
  )
}
