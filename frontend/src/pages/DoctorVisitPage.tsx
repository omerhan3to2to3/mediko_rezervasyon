import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RequireRole } from '../components/RequireRole'
import { apiFetch, isApiError } from '../api/http'

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

type Visit = {
  id: number
  appointmentId: number
  doctorId: number
  diagnosisNotes?: string | null
  treatmentNotes?: string | null
}

type ClinicalDocument = {
  id: number
  docType: 'REPORT' | 'PRESCRIPTION' | 'REFERRAL'
  contentText: string
  createdAt: string
}

export function DoctorVisitPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const apptId = Number(appointmentId)
  const [appt, setAppt] = useState<Appointment | null>(null)
  const [visit, setVisit] = useState<Visit | null>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [docType, setDocType] = useState<'REPORT' | 'PRESCRIPTION'>('REPORT')
  const [docContent, setDocContent] = useState('')
  const [docs, setDocs] = useState<ClinicalDocument[]>([])
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadAppointment() {
    setError(null)
    try {
      const a = await apiFetch<Appointment>(`/api/appointments/${apptId}`)
      if (!a) {
        setError('Randevu yanıtı alınamadı')
        return
      }
      setAppt(a)
    } catch (err: unknown) {
      setError(isApiError(err) ? err.detail : 'Randevu bulunamadı')
    }
  }

  async function loadVisitAndDocs(vId: number) {
    try {
      const drows = await apiFetch<ClinicalDocument[]>(`/api/doctor/visits/${vId}/documents`)
      setDocs(drows ?? [])
    } catch {
      setDocs([])
    }
  }

  useEffect(() => {
    if (!Number.isFinite(apptId)) return
    void loadAppointment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptId])

  useEffect(() => {
    if (!Number.isFinite(apptId)) return
    apiFetch<Visit>(`/api/doctor/appointments/${apptId}/visit`)
      .then((v) => {
        if (!v) {
          setVisit(null)
          setDocs([])
          return
        }
        setVisit(v)
        setDiagnosis(v.diagnosisNotes ?? '')
        setTreatment(v.treatmentNotes ?? '')
        void loadVisitAndDocs(v.id)
      })
      .catch(() => {
        setVisit(null)
        setDocs([])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptId])

  async function saveVisit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const v = await apiFetch<Visit>(`/api/doctor/appointments/${apptId}/visit`, {
        method: 'PUT',
        body: JSON.stringify({ diagnosisNotes: diagnosis, treatmentNotes: treatment }),
      })
      if (!v) {
        setError('Geçersiz yanıt')
        return
      }
      setVisit(v)
      setInfo('Muayene kaydı güncellendi.')
      await loadAppointment()
      void loadVisitAndDocs(v.id)
    } catch (err: unknown) {
      setError(isApiError(err) ? err.detail : 'Kayıt başarısız')
    }
  }

  async function addDocument(e: FormEvent) {
    e.preventDefault()
    if (!visit) {
      setError('Önce muayene kaydını kaydedin.')
      return
    }
    setError(null)
    try {
      await apiFetch(`/api/doctor/visits/${visit.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({ docType, contentText: docContent }),
      })
      setDocContent('')
      setInfo('Rapor / reçete eklendi.')
      void loadVisitAndDocs(visit.id)
    } catch (err: unknown) {
      setError(isApiError(err) ? err.detail : 'Eklenemedi')
    }
  }

  return (
    <RequireRole role="DOCTOR">
      <div className="page">
        <div className="row spread align-center">
          <h2>Muayene</h2>
          <Link className="btn ghost" to="/app/doktor">
            ← Günlük liste
          </Link>
        </div>

        {appt && (
          <div className="card stack subtle mt">
            <div className="row spread">
              <div>
                <strong>{appt.patientName}</strong>{' '}
                <span className="muted small">Randevu #{appt.id}</span>
              </div>
              <span className="pill subtle">{appt.status}</span>
            </div>
            <div className="muted small">
              {appt.clinicName} · {new Date(appt.startAt).toLocaleString('tr-TR')}
            </div>
          </div>
        )}

        <form className="card stack mt" onSubmit={saveVisit}>
          <h3>Klinik notlar</h3>
          <label className="field">
            <span>Tanı / bulgular</span>
            <textarea rows={4} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </label>
          <label className="field">
            <span>Tedavi</span>
            <textarea rows={4} value={treatment} onChange={(e) => setTreatment(e.target.value)} />
          </label>
          {info && <div className="alert ok">{info}</div>}
          {error && <div className="alert error">{error}</div>}
          <button className="btn primary" type="submit">
            Kaydet
          </button>
          {visit && (
            <div className="muted small">
              Ziyaret kaydı ID: <strong>{visit.id}</strong> (vezne bu randevu numarasıyla işlem ekler)
            </div>
          )}
        </form>

        <form className="card stack mt" onSubmit={addDocument}>
          <h3>Rapor veya reçete</h3>
          <div className="row wrap">
            <label className="field flex">
              <span>Tip</span>
              <select value={docType} onChange={(e) => setDocType(e.target.value as 'REPORT' | 'PRESCRIPTION')}>
                <option value="REPORT">Rapor</option>
                <option value="PRESCRIPTION">Reçete</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>İçerik</span>
            <textarea rows={5} value={docContent} onChange={(e) => setDocContent(e.target.value)} required />
          </label>
          <button className="btn secondary" type="submit" disabled={!visit}>
            Ekle
          </button>
        </form>

        {docs.length > 0 && (
          <div className="card stack mt">
            <h3>Eklenen belgeler</h3>
            <ul className="doc-list">
              {docs.map((d) => (
                <li key={d.id}>
                  <div className="row spread">
                    <strong>{d.docType}</strong>
                    <span className="muted small">{new Date(d.createdAt).toLocaleString('tr-TR')}</span>
                  </div>
                  <pre className="doc-pre">{d.contentText}</pre>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </RequireRole>
  )
}
