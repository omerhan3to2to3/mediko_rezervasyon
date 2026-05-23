import type { FormEvent } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { RequireRole } from '../components/RequireRole'
import { apiFetch, isApiError } from '../api/http'

type Patient = {
  id: number
  tcKimlik: string
  firstName: string
  lastName: string
  phone?: string | null
  email?: string | null
}

export function RegistrationPage() {
  const phonePattern = /^05\d{9}$/
  
  // Form fields
  const [tcKimlik, setTcKimlik] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  
  // Statuses
  const [msg, setMsg] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [pending, setPending] = useState(false)
  
  // Edit mode
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null)
  
  // Search & List pane state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [patientPage, setPatientPage] = useState(1)
  const patientPerPage = 10

  // Fetch patients list
  async function fetchPatients(query: string) {
    setSearchLoading(true)
    try {
      const data = await apiFetch<Patient[]>(`/api/patients/search?q=${encodeURIComponent(query)}`)
      setSearchedPatients(data ?? [])
    } catch (err) {
      console.error('Hasta arama hatası:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  // Load initial patient list
  useEffect(() => {
    fetchPatients('')
  }, [])

  // Trigger search on query change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPatients(searchQuery)
      setPatientPage(1)
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  const paginatedPatients = useMemo(() => {
    const start = (patientPage - 1) * patientPerPage
    return searchedPatients.slice(start, start + patientPerPage)
  }, [searchedPatients, patientPage])

  const totalPatientPages = Math.ceil(searchedPatients.length / patientPerPage)

  // Restrict TC Input to numeric 11 digits
  const handleTcChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (digits.length <= 11) {
      setTcKimlik(digits)
    }
  }

  // Restrict Phone Input to numeric 11 digits
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (digits.length <= 11) {
      setPhone(digits)
    }
  }

  // Render 11 dots remaining counter
  const renderDots = (value: string, maxLen: number = 11) => {
    const remaining = Math.max(0, maxLen - value.length)
    return (
      <div style={{ display: 'flex', gap: '5px', marginTop: '6px', alignItems: 'center' }}>
        {Array.from({ length: maxLen }).map((_, i) => {
          const isActive = i < value.length
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isActive ? 'var(--brand)' : '#cbd5e1',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
            />
          )
        })}
        {remaining > 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>
            {remaining} hane kaldı
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--ok)', marginLeft: '6px', fontWeight: 'bold' }}>
            ✓ Tamamlandı
          </span>
        )}
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const normalizedPhone = phone.trim()
    if (normalizedPhone !== '' && !phonePattern.test(normalizedPhone)) {
      setMsg('Telefon numarası 05xxxxxxxxx formatında olmalıdır. Örnek: 05321234567')
      return
    }
    setPending(true)
    try {
      if (editingPatientId) {
        // Edit Mode
        const updated = await apiFetch<Patient>(`/api/patients/${editingPatientId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            firstName,
            lastName,
            phone: normalizedPhone || undefined,
            email: email || undefined,
          }),
        })
        setPatient(updated)
        setMsg('Hasta bilgileri güncellendi.')
        clearForm()
        fetchPatients(searchQuery)
      } else {
        // Create Mode
        const created = await apiFetch<Patient>('/api/patients', {
          method: 'POST',
          body: JSON.stringify({
            tcKimlik,
            firstName,
            lastName,
            phone: normalizedPhone || undefined,
            email: email || undefined,
          }),
        })
        setPatient(created)
        setMsg('Hasta kaydı oluşturuldu.')
        clearForm()
        fetchPatients('')
      }
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Kayıt başarısız')
    } finally {
      setPending(false)
    }
  }

  const clearForm = () => {
    setTcKimlik('')
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setEditingPatientId(null)
  }

  const handleEditClick = (p: Patient) => {
    setEditingPatientId(p.id)
    setTcKimlik(p.tcKimlik) // TC can not be changed by the clerk usually, but populated for display
    setFirstName(p.firstName)
    setLastName(p.lastName)
    setPhone(p.phone || '')
    setEmail(p.email || '')
    setMsg(null)
  }

  return (
    <RequireRole role="REGISTRATION_CLERK">
      <div className="page">
        <h2>Hasta Kayıt & Sorgulama İşlemleri</h2>
        <p className="muted">Muayene olacak hastaların kayıtlarını yapabilir, güncelleyebilir veya arama paneliyle hastaları görüntüleyebilirsiniz.</p>
        
        <div className="alert subtle" style={{ borderLeft: '4px solid var(--brand)', background: 'rgba(30, 58, 138, 0.02)', padding: '1rem 1.25rem', marginBottom: '0.5rem' }}>
          💡 <strong>Kayıt & Güncelleme Kılavuzu:</strong> Yeni hasta eklerken T.C. Kimlik numarasının 11 haneli ve benzersiz olduğundan emin olun. Nokta sayaçları dolana kadar giriş yapmaya devam edebilirsiniz.
        </div>

        <div className="stack" style={{ maxWidth: '850px', margin: '0 auto', width: '100%', gap: '2rem' }}>
          {/* Form Card */}
          <div style={{ width: '100%' }}>
            <form className="card stack" onSubmit={onSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="stack">
                <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                  <span>{editingPatientId ? 'Hasta Bilgilerini Güncelle' : 'Yeni Hasta Kaydı'}</span>
                  {editingPatientId && (
                    <span className="pill warn">Düzenleme Modu</span>
                  )}
                </h3>
                
                <label className="field">
                  <span>TC kimlik no</span>
                  <input
                    value={tcKimlik}
                    onChange={(e) => handleTcChange(e.target.value)}
                    required
                    maxLength={11}
                    disabled={editingPatientId !== null} // Prevent changing TC during edit
                    placeholder="11 Haneli T.C. No"
                    style={{ letterSpacing: '0.05em' }}
                  />
                  {!editingPatientId && renderDots(tcKimlik, 11)}
                </label>

                <div className="row">
                  <label className="field flex">
                    <span>Ad</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="Adı"
                    />
                  </label>
                  <label className="field flex">
                    <span>Soyad</span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Soyadı"
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Telefon</span>
                  <input
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="05xxxxxxxxx"
                    inputMode="numeric"
                    maxLength={11}
                  />
                  {renderDots(phone, 11)}
                </label>

                <label className="field">
                  <span>E-posta</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="örnek@eposta.com"
                  />
                </label>
              </div>

              <div className="stack" style={{ marginTop: '1.5rem' }}>
                {msg && <div className={`alert ${patient && !msg.includes('hatası') && !msg.includes('başarısız') ? 'ok' : 'error'}`}>{msg}</div>}
                
                <div className="row" style={{ gap: '0.5rem' }}>
                  <button className="btn primary flex" type="submit" disabled={pending}>
                    {pending ? 'İşlem yapılıyor…' : editingPatientId ? 'Bilgileri Güncelle' : 'Hasta Kaydet'}
                  </button>
                  {editingPatientId && (
                    <button className="btn ghost" type="button" onClick={clearForm}>
                      İptal Et
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Search & List Pane */}
          <div style={{ width: '100%' }}>
            <div className="card stack subtle" style={{ width: '100%', gap: '1.25rem' }}>
              <h3>Kayıtlı Hastalar</h3>
              <p className="muted small" style={{ margin: 0 }}>Poliklinikte kayıtlı olan tüm hastaların listesi. Buradan hastaları arayabilir ve bilgilerini güncelleyebilirsiniz.</p>
              
              <div className="field">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="T.C. Kimlik, Ad veya Soyad ile ara..."
                  style={{ width: '100%' }}
                />
              </div>

              {searchLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                  Hastalar yükleniyor...
                </div>
              ) : searchedPatients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  Aranan kriterlere uygun kayıtlı hasta bulunamadı.
                </div>
              ) : (
                <>
                  <div className="table-wrap" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>T.C. Kimlik</th>
                          <th>Ad Soyad</th>
                          <th>İletişim</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPatients.map((p) => (
                          <tr key={p.id} style={{ background: editingPatientId === p.id ? 'rgba(245, 158, 11, 0.05)' : undefined }}>
                            <td style={{ fontWeight: 600 }}>{p.tcKimlik}</td>
                            <td>{p.firstName} {p.lastName}</td>
                            <td className="small muted">
                              {p.phone || 'Telefon yok'} <br />
                              {p.email || 'E-posta yok'}
                            </td>
                            <td>
                              <button
                                className="btn tiny secondary"
                                onClick={() => handleEditClick(p)}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                Düzenle
                              </button>
                            </td>
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
          </div>
        </div>
      </div>
    </RequireRole>
  )
}
