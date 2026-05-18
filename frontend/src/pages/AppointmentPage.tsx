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
  const [lastAppointment, setLastAppointment] = useState<Appointment | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    apiFetch<Clinic[]>('/api/clinics')
      .then((rows) => setClinics(rows ?? []))
      .catch(() => undefined)
  }, [])

  async function loadAvailability() {
    if (clinicId === '') return
    setMsg(null)
    try {
      const rows =
        (await apiFetch<DoctorSlots[]>(
          `/api/availability?clinicId=${clinicId}&date=${encodeURIComponent(date)}`,
        )) ?? []
      setAvailability(rows)
      setDoctorFilter(ANY_DOCTOR)
      setSelectedDoctorId('')
      setSelectedStart(null)
      const total = rows.reduce((a, r) => a + r.slots.length, 0)
      if (total === 0) {
        const alt =
          (await apiFetch<AltDate[]>(
            `/api/availability/alternatives?clinicId=${clinicId}&fromDate=${encodeURIComponent(date)}&limit=6`,
          )) ?? []
        setAlternatives(alt)
      } else {
        setAlternatives([])
      }
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Müsaitlik yüklenemedi')
    }
  }

  useEffect(() => {
    void loadAvailability()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional clinic/date driven reload
  }, [clinicId, date])

  async function lookupPatient(e?: FormEvent) {
    e?.preventDefault()
    setMsg(null)
    setPatient(null)
    try {
      const p = await apiFetch<Patient>(`/api/patients/by-tc/${encodeURIComponent(tcSearch.trim())}`)
      setPatient(p)
    } catch {
      setMsg('Hasta bulunamadı. Önce kayıt görevlisinde kayıt açılmalıdır.')
    }
  }

  const flatSlots = useMemo(() => {
    const rows: { doctorId: number; doctorName: string; slot: Slot }[] = []
    for (const d of availability) {
      if (doctorFilter !== ANY_DOCTOR && d.doctorId !== doctorFilter) {
        continue
      }
      for (const s of d.slots) {
        rows.push({ doctorId: d.doctorId, doctorName: d.doctorName, slot: s })
      }
    }
    rows.sort((a, b) => a.slot.startAt.localeCompare(b.slot.startAt))
    return rows
  }, [availability, doctorFilter])

  const doctorOptions = useMemo(() => {
    return [...availability]
      .map((d) => ({ doctorId: d.doctorId, doctorName: d.doctorName }))
      .sort((a, b) => a.doctorName.localeCompare(b.doctorName, 'tr'))
  }, [availability])

  async function book(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!patient || selectedDoctorId === '' || !selectedStart) {
      setMsg('Hasta, doktor ve saat seçimi zorunludur.')
      return
    }
    setPending(true)
    try {
      const body = await apiFetch<Appointment>('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: patient.id,
          doctorId: selectedDoctorId,
          startAt: selectedStart,
        }),
      })
      setLastAppointment(body)
      setMsg('Randevu oluşturuldu.')
      await loadAvailability()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Randevu oluşturulamadı')
    } finally {
      setPending(false)
    }
  }

  return (
    <RequireRole role="APPOINTMENT_CLERK">
      <div className="page">
        <h2>Randevu</h2>
        <p className="muted">Klinik ve tarihe göre müsait doktor slotları; hasta TC ile eşleştirin.</p>

        <div className="card stack">
          <h3>Hasta</h3>
          <form className="row wrap" onSubmit={lookupPatient}>
            <label className="field flex">
              <span>TC kimlik</span>
              <input value={tcSearch} onChange={(e) => setTcSearch(e.target.value)} pattern="\d{11}" />
            </label>
            <button type="submit" className="btn secondary">
              Sorgula
            </button>
          </form>
          {patient && (
            <div className="pill-row">
              <span className="pill ok">
                {patient.firstName} {patient.lastName}
              </span>
              <span className="pill">ID: {patient.id}</span>
            </div>
          )}
        </div>

        <div className="card stack mt">
          <h3>Müsaitlik</h3>
          <div className="row wrap">
            <label className="field flex">
              <span>Klinik</span>
              <select value={clinicId} onChange={(e) => setClinicId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Seçin</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field flex">
              <span>Tarih</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field flex">
              <span>Doktor</span>
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
            <button type="button" className="btn ghost" onClick={() => void loadAvailability()}>
              Yenile
            </button>
          </div>

          {alternatives.length > 0 && (
            <div className="alert subtle">
              Bu tarihte uygun slot yok. Önerilen tarihler:{' '}
              {alternatives.map((a) => (
                <button
                  key={a.date}
                  type="button"
                  className="linkish"
                  onClick={() => setDate(a.date)}
                  title={`${a.suggestedSlotCount} slot`}
                >
                  {a.date}
                </button>
              ))}
            </div>
          )}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Doktor</th>
                  <th>Başlangıç</th>
                  <th>Seç</th>
                </tr>
              </thead>
              <tbody>
                {flatSlots.map((row) => {
                  const label = new Date(row.slot.startAt).toLocaleString('tr-TR')
                  const selected =
                    selectedDoctorId === row.doctorId && selectedStart === row.slot.startAt
                  return (
                    <tr key={`${row.doctorId}-${row.slot.startAt}`}>
                      <td>{row.doctorName}</td>
                      <td>{label}</td>
                      <td>
                        <button
                          type="button"
                          className={selected ? 'btn tiny primary' : 'btn tiny ghost'}
                          onClick={() => {
                            setSelectedDoctorId(row.doctorId)
                            setSelectedStart(row.slot.startAt)
                          }}
                        >
                          Seç
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {flatSlots.length === 0 && (
                  <tr>
                    <td colSpan={3} className="muted">
                      Slot bulunamadı (hafta sonu veya dolu olabilir).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form className="stack mt" onSubmit={book}>
            {msg && <div className={`alert ${lastAppointment ? 'ok' : 'error'}`}>{msg}</div>}
            <button className="btn primary" type="submit" disabled={pending}>
              {pending ? 'Kaydediliyor…' : 'Randevuyu oluştur'}
            </button>
          </form>

          {lastAppointment && (
            <div className="card subtle stack mt">
              <div className="row spread">
                <strong>Oluşturulan randevu</strong>
                <span className="pill">No: {lastAppointment.id}</span>
              </div>
              <div className="muted small">
                {lastAppointment.patientName} · {lastAppointment.doctorName} ·{' '}
                {new Date(lastAppointment.startAt).toLocaleString('tr-TR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  )
}
