import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { RequireRole } from '../components/RequireRole'
import { apiFetch, isApiError } from '../api/http'
import type { Role } from '../auth/AuthContext'

type Clinic = { id: number; name: string; active: boolean; doctorCount?: number }
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

type Patient = {
  id: number
  tcKimlik: string
  firstName: string
  lastName: string
  phone?: string | null
  email?: string | null
}

type AppointmentResponse = {
  id: number
  patientId: number
  patientName: string
  patientTc: string
  doctorId: number
  doctorName: string
  clinicId: number
  clinicName: string
  startAt: string
  endAt: string
  status: string
  visitId: number | null
  paid: boolean
}

function PatientSearchCard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [patientPage, setPatientPage] = useState(1)
  const patientPerPage = 10

  async function fetchPatients(query: string) {
    setLoading(true)
    try {
      const data = await apiFetch<Patient[]>(`/api/patients/search?q=${encodeURIComponent(query)}`)
      setPatients(data ?? [])
    } catch (err) {
      console.error('Hasta arama hatası:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients('')
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPatients(searchQuery)
      setPatientPage(1) // Reset page on search query change
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  const paginatedPatients = useMemo(() => {
    const start = (patientPage - 1) * patientPerPage
    return patients.slice(start, start + patientPerPage)
  }, [patients, patientPage])

  const totalPatientPages = Math.ceil(patients.length / patientPerPage)

  return (
    <div className="card stack mt">
      <h3>Kayıtlı Hastalar & Bilgileri</h3>
      <p className="muted small">
        Sistemde kayıtlı olan tüm hastaları T.C. Kimlik numarası, ad veya soyad ile arayabilir ve iletişim bilgilerini görüntüleyebilirsiniz.
      </p>
      
      <div className="field">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="T.C. Kimlik, Ad veya Soyad ile ara..."
          style={{ width: '100%' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted)' }}>
          Hastalar yükleniyor...
        </div>
      ) : patients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted)', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
          Aranan kriterlere uygun kayıtlı hasta bulunamadı.
        </div>
      ) : (
        <>
          <div className="table-wrap" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>T.C. Kimlik</th>
                  <th>Ad Soyad</th>
                  <th>Telefon</th>
                  <th>E-posta</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.tcKimlik}</td>
                    <td>{p.firstName} {p.lastName}</td>
                    <td>{p.phone || <span className="muted">-</span>}</td>
                    <td>{p.email || <span className="muted">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPatientPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="btn tiny secondary"
                type="button"
                disabled={patientPage === 1}
                onClick={() => setPatientPage(prev => Math.max(1, prev - 1))}
              >
                ◀ Önceki
              </button>
              <span className="muted small">
                Sayfa <strong>{patientPage}</strong> / {totalPatientPages}
              </span>
              <button
                className="btn tiny secondary"
                type="button"
                disabled={patientPage === totalPatientPages}
                onClick={() => setPatientPage(prev => Math.min(totalPatientPages, prev + 1))}
              >
                Sonraki ▶
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | ''>('')
  const [clinicId, setClinicId] = useState<number | ''>('')
  const [doctorFullName, setDoctorFullName] = useState('')
  const [userMsg, setUserMsg] = useState<string | null>(null)
  const [clinicMsg, setClinicMsg] = useState<string | null>(null)
  const [reportMsg, setReportMsg] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [newClinicName, setNewClinicName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState<Role | ''>('')
  const [editClinicId, setEditClinicId] = useState<number | ''>('')
  const [editDoctorName, setEditDoctorName] = useState('')
  const [reportRows, setReportRows] = useState<AppointmentResponse[] | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportPage, setReportPage] = useState(1)
  const reportPerPage = 10

  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userPage, setUserPage] = useState(1)
  const userPerPage = 10

  const [editingClinicId, setEditingClinicId] = useState<number | null>(null)
  const [editClinicName, setEditClinicName] = useState('')
  const [clinicSearchQuery, setClinicSearchQuery] = useState('')
  const [clinicPage, setClinicPage] = useState(1)
  const clinicPerPage = 10

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
    setUserMsg(null)
    if (selectedRole === '') {
      setUserMsg('Bir rol seçmelisiniz.')
      return
    }
    if (hasDoctorRole && clinicId === '') {
      setUserMsg('Doktor rolü için klinik seçimi zorunludur.')
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
      setUserMsg('Kullanıcı oluşturuldu.')
      setUsername('')
      setPassword('')
      setSelectedRole('')
      setClinicId('')
      setDoctorFullName('')
      await loadData()
    } catch (err: unknown) {
      setUserMsg(isApiError(err) ? err.detail : 'Kullanıcı oluşturulamadı')
    } finally {
      setPending(false)
    }
  }

  async function createClinic(e: FormEvent) {
    e.preventDefault()
    setClinicMsg(null)
    try {
      await apiFetch('/api/admin/clinics', {
        method: 'POST',
        body: JSON.stringify({ name: newClinicName.trim() }),
      })
      setNewClinicName('')
      setClinicMsg('Yeni klinik eklendi.')
      await loadData()
    } catch (err: unknown) {
      setClinicMsg(isApiError(err) ? err.detail : 'Klinik eklenemedi')
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
    setUserMsg(null)
    if (editRole === '') {
      setUserMsg('Bir rol seçmelisiniz.')
      return
    }
    if (editRole === 'DOCTOR' && editClinicId === '') {
      setUserMsg('Doktor rolü için klinik seçimi zorunludur.')
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
      setUserMsg('Kullanıcı güncellendi.')
      cancelEdit()
      await loadData()
    } catch (err: unknown) {
      setUserMsg(isApiError(err) ? err.detail : 'Kullanıcı güncellenemedi')
    }
  }

  async function deleteUser(userId: number, usernameText: string) {
    if (!confirm(`"${usernameText}" kullanıcısını silmek istiyor musunuz?`)) return
    setUserMsg(null)
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      setUserMsg('Kullanıcı silindi.')
      if (editingId === userId) cancelEdit()
      await loadData()
    } catch (err: unknown) {
      setUserMsg(isApiError(err) ? err.detail : 'Kullanıcı silinemedi')
    }
  }

  function startClinicEdit(c: Clinic) {
    setEditingClinicId(c.id)
    setEditClinicName(c.name)
  }

  function cancelClinicEdit() {
    setEditingClinicId(null)
    setEditClinicName('')
  }

  async function saveClinicEdit(cId: number) {
    setClinicMsg(null)
    if (!editClinicName.trim()) {
      setClinicMsg('Klinik adı boş olamaz.')
      return
    }
    try {
      await apiFetch(`/api/admin/clinics/${cId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editClinicName.trim() }),
      })
      setClinicMsg('Klinik güncellendi.')
      cancelClinicEdit()
      await loadData()
    } catch (err: unknown) {
      setClinicMsg(isApiError(err) ? err.detail : 'Klinik güncellenemedi')
    }
  }

  async function deleteClinic(cId: number, nameText: string) {
    if (!confirm(`"${nameText}" kliniğini silmek istediğinizden emin misiniz?`)) return
    setClinicMsg(null)
    try {
      await apiFetch(`/api/admin/clinics/${cId}`, { method: 'DELETE' })
      setClinicMsg('Klinik silindi.')
      await loadData()
    } catch (err: unknown) {
      setClinicMsg(isApiError(err) ? err.detail : 'Klinik silinemedi')
    }
  }

  async function fetchReportData(e: FormEvent) {
    e.preventDefault()
    setReportMsg(null)
    setReportLoading(true)
    setReportRows(null)
    setReportPage(1)
    try {
      const data = await apiFetch<AppointmentResponse[]>(
        `/api/admin/reports/appointments/data?period=${reportPeriod}&date=${encodeURIComponent(reportDate)}`
      )
      setReportRows(data ?? [])
      setReportMsg('Rapor verileri başarıyla yüklendi.')
    } catch (err: unknown) {
      setReportMsg(isApiError(err) ? err.detail : 'Rapor verileri alınamadı')
      setReportRows([])
    } finally {
      setReportLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => 
      u.username.toLowerCase().includes(q) ||
      (u.doctorFullName && u.doctorFullName.toLowerCase().includes(q)) ||
      (u.clinicName && u.clinicName.toLowerCase().includes(q)) ||
      u.roles.some(r => (roleLabels[r as Role] || r).toLowerCase().includes(q))
    )
  }, [users, userSearchQuery])

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPerPage
    return filteredUsers.slice(start, start + userPerPage)
  }, [filteredUsers, userPage])

  const totalUserPages = Math.ceil(filteredUsers.length / userPerPage)

  useEffect(() => {
    setUserPage(1)
  }, [userSearchQuery])

  const filteredClinics = useMemo(() => {
    const q = clinicSearchQuery.trim().toLowerCase()
    if (!q) return clinics
    return clinics.filter(c => c.name.toLowerCase().includes(q))
  }, [clinics, clinicSearchQuery])

  const paginatedClinics = useMemo(() => {
    const start = (clinicPage - 1) * clinicPerPage
    return filteredClinics.slice(start, start + clinicPerPage)
  }, [filteredClinics, clinicPage])

  const totalClinicPages = Math.ceil(filteredClinics.length / clinicPerPage)

  useEffect(() => {
    setClinicPage(1)
  }, [clinicSearchQuery])

  const paginatedReportRows = useMemo(() => {
    if (!reportRows) return []
    const start = (reportPage - 1) * reportPerPage
    return reportRows.slice(start, start + reportPerPage)
  }, [reportRows, reportPage])

  const totalReportPages = reportRows ? Math.ceil(reportRows.length / reportPerPage) : 0

  async function downloadReport(e: FormEvent) {
    e.preventDefault()
    setReportMsg(null)
    const token = localStorage.getItem('token')
    if (!token) {
      setReportMsg('Oturum bulunamadi.')
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
        setReportMsg(txt || 'Rapor indirilemedi')
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
      setReportMsg('PDF rapor indirildi.')
    } catch {
      setReportMsg('Rapor indirilemedi')
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

          {userMsg && <div className="alert subtle">{userMsg}</div>}
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? 'Kaydediliyor…' : 'Kullanıcı oluştur'}
          </button>
        </form>

        <div className="card stack mt">
          <h3>Mevcut kullanıcılar</h3>
          
          <div className="field">
            <input
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Kullanıcı adı, hekim adı veya rol ile ara..."
              style={{ width: '100%' }}
            />
          </div>

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
                {paginatedUsers.map((u) => (
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
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '1.5rem' }}>
                      Aranan kriterlere uygun kullanıcı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalUserPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="btn tiny secondary"
                type="button"
                disabled={userPage === 1}
                onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
              >
                ◀ Önceki
              </button>
              <span className="muted small">
                Sayfa <strong>{userPage}</strong> / {totalUserPages}
              </span>
              <button
                className="btn tiny secondary"
                type="button"
                disabled={userPage === totalUserPages}
                onClick={() => setUserPage(prev => Math.min(totalUserPages, prev + 1))}
              >
                Sonraki ▶
              </button>
            </div>
          )}
        </div>

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
          {clinicMsg && <div className="alert subtle">{clinicMsg}</div>}
        </form>

        <div className="card stack mt">
          <h3>Mevcut Klinikler</h3>
          <p className="muted small">
            Sistemde aktif olan tüm klinikleri listeleyebilir, isimlerini güncelleyebilir veya hekim ataması olmayan klinikleri silebilirsiniz.
          </p>
          <div className="field">
            <input
              value={clinicSearchQuery}
              onChange={(e) => setClinicSearchQuery(e.target.value)}
              placeholder="Poliklinik adı ile ara..."
              style={{ width: '100%' }}
            />
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Poliklinik Adı</th>
                  <th>Hekim Sayısı</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClinics.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {editingClinicId === c.id ? (
                        <input
                          value={editClinicName}
                          onChange={(e) => setEditClinicName(e.target.value)}
                          style={{ width: '100%' }}
                          required
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td>
                      <span className="pill subtle" style={{ fontSize: '0.8rem' }}>
                        {c.doctorCount ?? 0} Hekim
                      </span>
                    </td>
                    <td className="row wrap">
                      {editingClinicId === c.id ? (
                        <>
                          <button
                            type="button"
                            className="btn tiny primary"
                            onClick={() => void saveClinicEdit(c.id)}
                          >
                            Kaydet
                          </button>
                          <button
                            type="button"
                            className="btn tiny ghost"
                            onClick={cancelClinicEdit}
                          >
                            Vazgeç
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn tiny ghost"
                            onClick={() => startClinicEdit(c)}
                          >
                            Düzenle
                          </button>
                          {c.doctorCount && c.doctorCount > 0 ? (
                            <button
                              type="button"
                              className="btn tiny disabled"
                              disabled
                              title="Hekim tanımlı klinik silinemez"
                              style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            >
                              Sil
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn tiny"
                              onClick={() => void deleteClinic(c.id, c.name)}
                            >
                              Sil
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedClinics.length === 0 && (
                  <tr>
                    <td colSpan={3} className="muted" style={{ textAlign: 'center', padding: '1.5rem' }}>
                      Aranan kriterlere uygun klinik bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalClinicPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="btn tiny secondary"
                type="button"
                disabled={clinicPage === 1}
                onClick={() => setClinicPage(prev => Math.max(1, prev - 1))}
              >
                ◀ Önceki
              </button>
              <span className="muted small">
                Sayfa <strong>{clinicPage}</strong> / {totalClinicPages}
              </span>
              <button
                className="btn tiny secondary"
                type="button"
                disabled={clinicPage === totalClinicPages}
                onClick={() => setClinicPage(prev => Math.min(totalClinicPages, prev + 1))}
              >
                Sonraki ▶
              </button>
            </div>
          )}
        </div>

        <form className="card stack mt" onSubmit={fetchReportData}>
          <h3>Randevu Raporlama & Analiz Paneli</h3>
          <p className="muted small" style={{ margin: 0 }}>
            Seçtiğiniz dönem ve tarihe göre randevu kayıtlarını, muayene durumlarını ve ödeme dökümlerini inceleyebilir veya PDF olarak indirebilirsiniz.
          </p>
          <div className="row wrap" style={{ alignItems: 'flex-end', gap: '1rem' }}>
            <label className="field" style={{ width: '160px' }}>
              <span>Periyot</span>
              <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}>
                <option value="daily">Günlük</option>
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </label>
            <label className="field" style={{ width: '220px' }}>
              <span>Referans Tarih</span>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </label>
            <div className="row" style={{ gap: '0.5rem', flex: 1, minWidth: '280px' }}>
              <button className="btn primary flex" type="submit">
                Rapor Oluştur
              </button>
              <button className="btn secondary flex" type="button" onClick={downloadReport}>
                PDF İndir
              </button>
            </div>
          </div>
          {reportMsg && <div className="alert subtle">{reportMsg}</div>}
        </form>

        {reportLoading && (
          <div className="card mt" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
            Rapor verileri getiriliyor, lütfen bekleyin...
          </div>
        )}

        {!reportLoading && reportRows !== null && (
          <div className="card stack mt" style={{ borderLeft: '4px solid var(--brand)', background: '#ffffff', borderColor: 'var(--brand)' }}>
            <div className="row spread align-center">
              <h3 style={{ margin: 0 }}>Randevu Raporu Sonuçları</h3>
              <span className="pill ok" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                Toplam {reportRows.length} Aktif Kayıt
              </span>
            </div>
            
            {reportRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                Seçilen kriterlere uygun herhangi bir aktif randevu kayayı bulunamadı.
              </div>
            ) : (
              <>
                <p className="muted small" style={{ margin: 0 }}>
                  Seçilen dönemdeki randevu listesi aşağıdadır. İptal edilmiş randevular rapor dışında tutulmuştur.
                </p>
                <div className="table-wrap" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Randevu No</th>
                        <th>Tarih/Saat</th>
                        <th>Hasta (T.C.)</th>
                        <th>Hekim (Poliklinik)</th>
                        <th>Muayene Durumu</th>
                        <th>Ödeme Durumu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReportRows.map((row) => (
                        <tr key={row.id}>
                          <td style={{ fontWeight: 600 }}>#{row.id}</td>
                          <td>{new Date(row.startAt).toLocaleString('tr-TR')}</td>
                          <td>
                            <strong>{row.patientName}</strong> <br />
                            <span className="small muted">TC: {row.patientTc}</span>
                          </td>
                          <td>
                            <strong>{row.doctorName}</strong> <br />
                            <span className="small muted">{row.clinicName}</span>
                          </td>
                          <td>
                            <span
                              className={`pill ${
                                row.status === 'SCHEDULED'
                                  ? 'ok'
                                  : row.status === 'COMPLETED'
                                  ? 'subtle'
                                  : 'warn'
                              }`}
                            >
                              {row.status === 'SCHEDULED'
                                ? 'Muayene Bekliyor'
                                : row.status === 'COMPLETED'
                                ? 'Muayene Edildi'
                                : row.status === 'CANCELLED'
                                ? 'İptal Edildi'
                                : 'Gelmedi'}
                            </span>
                          </td>
                          <td>
                            {row.paid ? (
                              <span className="pill ok" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>✓ Ödendi</span>
                            ) : (
                              <span className="pill subtle" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>Ödenmedi</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalReportPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                    <button
                      className="btn tiny secondary"
                      type="button"
                      disabled={reportPage === 1}
                      onClick={() => setReportPage(prev => Math.max(1, prev - 1))}
                    >
                      ◀ Önceki
                    </button>
                    <span className="muted small">
                      Sayfa <strong>{reportPage}</strong> / {totalReportPages}
                    </span>
                    <button
                      className="btn tiny secondary"
                      type="button"
                      disabled={reportPage === totalReportPages}
                      onClick={() => setReportPage(prev => Math.min(totalReportPages, prev + 1))}
                    >
                      Sonraki ▶
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}


        {/* Patients List and Search section for Admins moved under User Management */}
        <PatientSearchCard />
      </div>
    </RequireRole>
  )
}
