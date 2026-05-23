import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { RequireRole } from '../components/RequireRole'
import { apiFetch, isApiError } from '../api/http'

type Clinic = { id: number; name: string; active: boolean }
type Slot = { startAt: string; endAt: string }
type DoctorSlots = { doctorId: number; doctorName: string; slots: Slot[] }
type AltDate = { date: string; suggestedSlotCount: number }

type Patient = {
  id: number
  tcKimlik: string
  firstName: string
  lastName: string
}

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

const SLOT_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
]

function formatAltDate(dateStr: string) {
  const d = new Date(dateStr)
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  const dayName = days[d.getDay()]
  
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]
  const day = d.getDate()
  const monthName = months[d.getMonth()]
  
  return {
    dayName,
    dateFormatted: `${day} ${monthName}`,
  }
}

export function AppointmentPage() {
  const ANY_DOCTOR = 'ANY'
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [clinicId, setClinicId] = useState<number | ''>('')
  const [doctorFilter, setDoctorFilter] = useState<number | 'ANY'>(ANY_DOCTOR)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [availability, setAvailability] = useState<DoctorSlots[]>([])
  const [alternatives, setAlternatives] = useState<AltDate[]>([])
  const [tcSearch, setTcSearch] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('')
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  
  const [dailyAppointments, setDailyAppointments] = useState<Appointment[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [patientMsg, setPatientMsg] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Fetch clinics
  useEffect(() => {
    apiFetch<Clinic[]>('/api/clinics')
      .then((rows) => setClinics(rows ?? []))
      .catch(() => undefined)
  }, [])

  // Load slot availability
  async function loadAvailability() {
    if (clinicId === '') return
    setMsg(null)
    try {
      const rows =
        (await apiFetch<DoctorSlots[]>(
          `/api/availability?clinicId=${clinicId}&date=${encodeURIComponent(date)}&_t=${Date.now()}`,
        )) ?? []
      setAvailability(rows)
      setSelectedDoctorId('')
      setSelectedStart(null)
      
      const total = rows.reduce((a, r) => a + r.slots.length, 0)
      if (total === 0) {
        const alt =
          (await apiFetch<AltDate[]>(
            `/api/availability/alternatives?clinicId=${clinicId}&fromDate=${encodeURIComponent(date)}&limit=6&_t=${Date.now()}`,
          )) ?? []
        setAlternatives(alt)
      } else {
        setAlternatives([])
      }
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Müsaitlik yüklenemedi')
    }
  }

  // Load daily appointments list
  async function fetchDailyAppointments() {
    try {
      const list = await apiFetch<Appointment[]>(`/api/appointments?date=${date}&_t=${Date.now()}`)
      setDailyAppointments(list ?? [])
    } catch (err) {
      console.error('Günlük randevular alınamadı:', err)
    }
  }

  useEffect(() => {
    void loadAvailability()
    void fetchDailyAppointments()
  }, [clinicId, date])

  // Look up patient
  async function lookupPatient(e?: FormEvent) {
    e?.preventDefault()
    setPatientMsg(null)
    setPatient(null)
    if (!tcSearch || tcSearch.length !== 11) {
      setPatientMsg('Lütfen 11 haneli T.C. Kimlik numarasını eksiksiz girin.')
      return
    }
    try {
      const p = await apiFetch<Patient>(`/api/patients/by-tc/${encodeURIComponent(tcSearch.trim())}`)
      setPatient(p)
    } catch {
      setPatientMsg('Hasta bulunamadı. Önce kayıt görevlisinde kayıt açılmalıdır.')
    }
  }

  // Filtered doctors list for availability
  const filteredAvailability = useMemo(() => {
    return availability.filter((d) => doctorFilter === ANY_DOCTOR || d.doctorId === doctorFilter)
  }, [availability, doctorFilter])

  const doctorOptions = useMemo(() => {
    return [...availability]
      .map((d) => ({ doctorId: d.doctorId, doctorName: d.doctorName }))
      .sort((a, b) => a.doctorName.localeCompare(b.doctorName, 'tr'))
  }, [availability])

  // Book appointment
  async function book(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!patient || selectedDoctorId === '' || !selectedStart) {
      setMsg('Hasta, doktor ve saat seçimi zorunludur.')
      return
    }
    setPending(true)
    try {
      await apiFetch<Appointment>('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: patient.id,
          doctorId: selectedDoctorId,
          startAt: selectedStart,
        }),
      })
      setMsg('Randevu başarıyla oluşturuldu.')
      setSelectedDoctorId('')
      setSelectedStart(null)
      await loadAvailability()
      await fetchDailyAppointments()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Randevu oluşturulamadı')
    } finally {
      setPending(false)
    }
  }

  // Cancel appointment
  async function handleCancel(id: number) {
    if (!window.confirm('Bu randevuyu iptal etmek istediğinize emin misiniz?')) return
    try {
      await apiFetch(`/api/appointments/${id}/cancel`, { method: 'PATCH' })
      setMsg('Randevu silindi.')
      await fetchDailyAppointments()
      await loadAvailability()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Randevu iptal edilemedi')
    }
  }

  // Helper to extract HH:MM local time from ISO string
  const getLocalTime = (isoString: string) => {
    const d = new Date(isoString)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Helper to match slot startAt for a doctor and slotTime
  const getSlotStartAt = (doctorSlots: Slot[], slotTime: string) => {
    const found = doctorSlots.find((s) => getLocalTime(s.startAt) === slotTime)
    return found ? found.startAt : null
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

  return (
    <RequireRole role="APPOINTMENT_CLERK">
      <div className="page">
        <h2>Randevu İşlemleri</h2>
        <p className="muted">Hastanın T.C. Kimlik numarasını sorguladıktan sonra klinik, tarih ve doktor seçimi yaparak MHRS şemasından randevu oluşturabilirsiniz.</p>
        
        <div className="alert subtle" style={{ borderLeft: '4px solid var(--brand)', background: 'rgba(30, 58, 138, 0.02)', padding: '1rem 1.25rem', marginBottom: '0.5rem' }}>
          💡 <strong>Randevu Kuralları:</strong> Poliklinik çalışma saatleri 09:00 - 17:00 arasındadır. 12:00 - 13:00 saatleri arası öğle tatilidir. Randevular 30 dakikalık zaman dilimlerinde verilmektedir.
        </div>

        {/* 1. Patient Query Section */}
        <div className="card stack">
          <h3>Hasta Bilgisi Sorgulama</h3>
          <form className="row wrap" onSubmit={lookupPatient} style={{ alignItems: 'flex-end' }}>
            <label className="field flex" style={{ flex: 2 }}>
              <span>Hasta T.C. Kimlik No</span>
              <input
                value={tcSearch}
                onChange={(e) => setTcSearch(e.target.value.replace(/\D/g, '').slice(0, 11))}
                pattern="\d{11}"
                maxLength={11}
                placeholder="11 Haneli T.C. Kimlik No"
              />
              {renderDots(tcSearch, 11)}
            </label>
            <button type="submit" className="btn primary" style={{ minWidth: '120px' }}>
              Hastayı Sorgula
            </button>
          </form>
          
          {patientMsg && <div className="alert error">{patientMsg}</div>}
          
          {patient && (
            <div className="pill-row" style={{ marginTop: '0.5rem' }}>
              <span className="pill ok" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                🟢 Hasta Bulundu: <strong>{patient.firstName} {patient.lastName}</strong> (T.C. {patient.tcKimlik})
              </span>
              <span className="pill" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>Hasta Sistem ID: {patient.id}</span>
            </div>
          )}
        </div>

        {/* 2. Slot & Grid Section */}
        <div
          className="card stack mt"
          style={{
            border: '1.5px solid #cbd5e1',
          }}
        >

          <h3>Randevu Bilgileri & Slot Seçimi</h3>
          
          {/* Wider Date, smaller & equal clinic/doctor */}
          <div className="row wrap" style={{ display: 'flex', gap: '1rem' }}>
            <label className="field" style={{ flex: 1.5, minWidth: '200px' }}>
              <span>Klinik Seçimi</span>
              <select value={clinicId} onChange={(e) => setClinicId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Klinik Seçin</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            
            <label className="field" style={{ flex: 2.5, minWidth: '250px' }}>
              <span>Tarih Seçimi</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            
            <label className="field" style={{ flex: 1.5, minWidth: '200px' }}>
              <span>Doktor Filtresi</span>
              <select
                value={doctorFilter}
                onChange={(e) => {
                  const value = e.target.value
                  setDoctorFilter(value === ANY_DOCTOR ? ANY_DOCTOR : Number(value))
                  setSelectedDoctorId('')
                  setSelectedStart(null)
                }}
              >
                <option value={ANY_DOCTOR}>Herhangi bir doktor</option>
                {doctorOptions.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.doctorName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {alternatives.length > 0 && (
            <div
              className="card subtle stack"
              style={{
                borderLeft: '4px solid var(--warn)',
                background: 'var(--warn-bg)',
                borderColor: 'var(--warn-border)',
                padding: '1.25rem 1.5rem',
                gap: '1rem',
                marginTop: '1rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>📅</span>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--warn)', fontSize: '1.05rem' }}>Seçilen Tarih İçin Müsait Muayene Saati Bulunamadı</h4>
                  <p className="muted small" style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Seçtiğiniz tarihte ({new Date(date).toLocaleDateString('tr-TR')}) poliklinik çalışma takvimi veya doluluk oranı sebebiyle uygun muayene saati bulunamamıştır. Hızlıca randevu oluşturmak için aşağıdaki önerilen müsait günleri tercih edebilirsiniz:
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {alternatives.map((a) => {
                  const formatted = formatAltDate(a.date)
                  return (
                    <button
                      key={a.date}
                      type="button"
                      className="alt-date-chip"
                      onClick={() => setDate(a.date)}
                      title={`${a.date} tarihine geç`}
                    >
                      <span className="alt-day-name">{formatted.dayName}</span>
                      <span className="alt-date-val">{formatted.dateFormatted}</span>
                      <span className="alt-slot-badge">
                        <span className="slot-dot"></span>
                        {a.suggestedSlotCount} Müsait
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* MHRS Hour-slot grid */}
          {clinicId !== '' && (
            <div className="card subtle stack" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>MHRS Muayene Saatleri Şeması</h4>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px' }} />
                    <span style={{ fontSize: '11px' }} className="muted">Boş</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '3px' }} />
                    <span style={{ fontSize: '11px' }} className="muted">Dolu</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#d1fae5', border: '1.5px solid #059669', borderRadius: '3px' }} />
                    <span style={{ fontSize: '11px' }} className="muted">Seçili</span>
                  </div>
                </div>
              </div>

              <div className="stack" style={{ gap: '1.25rem', marginTop: '0.75rem' }}>
                {filteredAvailability.map((d) => (
                  <div
                    key={d.doctorId}
                    style={{
                      display: 'flex',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '0.85rem',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ width: '180px', fontWeight: '700', color: 'var(--brand-dark)', fontSize: '0.95rem' }}>
                      👨‍⚕️ {d.doctorName}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                      {SLOT_TIMES.map((time) => {
                        const freeStartAt = getSlotStartAt(d.slots, time)
                        const isFree = freeStartAt !== null
                        const isSelected = selectedDoctorId === d.doctorId && selectedStart === freeStartAt && freeStartAt !== null

                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={!isFree}
                            onClick={() => {
                              if (isFree && freeStartAt) {
                                setSelectedDoctorId(d.doctorId)
                                setSelectedStart(freeStartAt)
                              }
                            }}
                            style={{
                              width: '54px',
                              height: '32px',
                              borderRadius: '6px',
                              fontFamily: 'inherit',
                              fontSize: '0.825rem',
                              fontWeight: '700',
                              display: 'grid',
                              placeItems: 'center',
                              cursor: isFree ? 'pointer' : 'not-allowed',
                              transition: 'all 0.15s ease',
                              border: isSelected
                                ? '2px solid #059669'
                                : isFree
                                ? '1.5px solid #cbd5e1'
                                : '1.5px solid #fca5a5',
                              background: isSelected
                                ? '#d1fae5'
                                : isFree
                                ? '#ffffff'
                                : '#fee2e2',
                              color: isSelected
                                ? '#065f46'
                                : isFree
                                ? '#475569'
                                : '#ef4444',
                              boxShadow: isSelected ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'none',
                            }}
                            title={isFree ? `${time} randevusu seç` : `${time} randevusu dolu`}
                          >
                            {time}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {filteredAvailability.length === 0 && (
                  <div className="muted" style={{ padding: '1rem', textAlign: 'center' }}>
                    Klinikte çalışan veya müsait doktor bulunmamaktadır.
                  </div>
                )}
              </div>
            </div>
          )}

          {clinicId === '' && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)', background: '#fafafb', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
              Doktor çalışma saatlerini listelemek için lütfen bir klinik seçin.
            </div>
          )}

          <form className="stack mt" onSubmit={book}>
            {selectedStart && (
              <div className="alert ok" style={{ borderLeft: '4px solid var(--ok)' }}>
                Seçilen Randevu: <strong>{getLocalTime(selectedStart)}</strong> - Hekim:{' '}
                <strong>
                  {availability.find((x) => x.doctorId === selectedDoctorId)?.doctorName}
                </strong>
              </div>
            )}
            
            {msg && <div className={`alert ${msg.includes('başarıyla') || msg.includes('iptal') ? 'ok' : 'error'}`}>{msg}</div>}
            
            {!patient ? (
              <div className="alert warn" style={{ margin: 0, borderLeft: '4px solid var(--warn)', display: 'block' }}>
                ⚠️ <strong>Müsaitlik İzleme Modu:</strong> Tarih ve saat şemasını inceleyebilir veya aşağıdaki tablodan seçili günün randevularını yönetebilirsiniz. Yeni randevu eklemek için lütfen en üstteki panelden <strong>Hasta Sorgulaması</strong> yapın.
              </div>
            ) : (
              <button className="btn primary" type="submit" disabled={pending || selectedDoctorId === '' || !selectedStart}>
                {pending ? 'Oluşturuluyor…' : 'Randevuyu Onayla ve Kaydet'}
              </button>
            )}
          </form>
        </div>

        {/* 3. Daily Appointments List with Cancel Button */}
        <div className="card stack mt">
          <h3>Seçili Günün Randevu Takibi & İptal İşlemleri</h3>
          <p className="muted small" style={{ margin: 0 }}>
            Seçtiğiniz tarihte ({new Date(date).toLocaleDateString('tr-TR')}) verilmiş olan tüm randevuların listesi. İptal işlemi buradan gerçekleştirilebilir.
          </p>

          {dailyAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              Bu tarihte henüz oluşturulmuş randevu bulunmamaktadır.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Randevu No</th>
                    <th>Hasta Adı</th>
                    <th>Doktor / Poliklinik</th>
                    <th>Randevu Saati</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyAppointments.map((app) => (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 600 }}>#{app.id}</td>
                      <td>{app.patientName}</td>
                      <td>
                        <strong>{app.doctorName}</strong> <br />
                        <span className="small muted">{app.clinicName}</span>
                      </td>
                      <td>{new Date(app.startAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <span
                          className={`pill ${
                            app.status === 'SCHEDULED'
                              ? 'ok'
                              : app.status === 'COMPLETED'
                              ? 'subtle'
                              : 'warn'
                          }`}
                        >
                          {app.status === 'SCHEDULED'
                            ? 'Muayene Bekliyor'
                            : app.status === 'COMPLETED'
                            ? 'Muayene Edildi'
                            : 'İptal Edildi'}
                        </span>
                      </td>
                      <td>
                        {app.status === 'SCHEDULED' && (
                          <button
                            type="button"
                            className="btn tiny secondary"
                            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                            onClick={() => handleCancel(app.id)}
                          >
                            Randevuyu İptal Et
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  )
}
