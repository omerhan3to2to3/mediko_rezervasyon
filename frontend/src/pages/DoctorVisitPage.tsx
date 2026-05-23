import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
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

type PastVisit = {
  id: number
  appointmentId: number
  doctorId: number
  doctorName: string
  clinicName: string
  visitDate: string
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
  
  // Current visit entry fields
  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [docType, setDocType] = useState<'REPORT' | 'PRESCRIPTION'>('REPORT')
  const [docContent, setDocContent] = useState('')
  const [docs, setDocs] = useState<ClinicalDocument[]>([])
  
  // General status
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Patient past visits (Health History)
  const [pastVisits, setPastVisits] = useState<PastVisit[]>([])
  const [pastVisitsLoading, setPastVisitsLoading] = useState(false)
  const [selectedPastVisit, setSelectedPastVisit] = useState<PastVisit | null>(null)
  const [pastVisitDocs, setPastVisitDocs] = useState<ClinicalDocument[]>([])
  const [pastVisitDocsLoading, setPastVisitDocsLoading] = useState(false)



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

  // Load past medical history across the hospital
  async function loadPatientHistory(patientId: number) {
    setPastVisitsLoading(true)
    try {
      const data = await apiFetch<PastVisit[]>(`/api/doctor/patients/${patientId}/visits`)
      setPastVisits(data ?? [])
    } catch (err) {
      console.error('Hasta geçmiş muayene kayıtları alınamadı:', err)
    } finally {
      setPastVisitsLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(apptId)) return
    void loadAppointment()
  }, [apptId])

  useEffect(() => {
    if (!appt?.patientId) return
    void loadPatientHistory(appt.patientId)
  }, [appt])

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
  }, [apptId])

  async function saveVisit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
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
      setInfo('Muayene kaydı başarıyla kaydedildi.')
      await loadAppointment()
      void loadVisitAndDocs(v.id)
      if (appt?.patientId) {
        void loadPatientHistory(appt.patientId) // Refresh history view
      }
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
    setInfo(null)
    try {
      await apiFetch(`/api/doctor/visits/${visit.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({ docType, contentText: docContent }),
      })
      setDocContent('')
      setInfo('Rapor / reçete başarıyla eklendi.')
      void loadVisitAndDocs(visit.id)
    } catch (err: unknown) {
      setError(isApiError(err) ? err.detail : 'Eklenemedi')
    }
  }

  // Load documents for a clicked past visit
  async function handlePastVisitClick(pv: PastVisit) {
    setSelectedPastVisit(pv)
    setPastVisitDocs([])
    setPastVisitDocsLoading(true)
    try {
      const list = await apiFetch<ClinicalDocument[]>(`/api/doctor/visits/${pv.id}/documents`)
      setPastVisitDocs(list ?? [])
    } catch (err) {
      console.error('Geçmiş muayene belgeleri alınamadı:', err)
    } finally {
      setPastVisitDocsLoading(false)
    }
  }

  return (
    <RequireRole role="DOCTOR">
      <div className="page">
        <div className="row spread align-center">
          <h2>Hasta Muayene Ekranı</h2>
          <Link className="btn ghost" to="/app/doktor">
            ← Günlük Randevu Listesi
          </Link>
        </div>

        {appt && (
          <div className="card stack subtle mt" style={{ borderLeft: '4px solid var(--brand)' }}>
            <div className="row spread">
              <div>
                <strong style={{ fontSize: '1.2rem' }}>{appt.patientName}</strong>{' '}
                <span className="muted small">· Randevu No: #{appt.id}</span>
              </div>
              <span
                className={`pill ${
                  appt.status === 'SCHEDULED'
                    ? 'ok'
                    : appt.status === 'COMPLETED'
                    ? 'subtle'
                    : 'warn'
                }`}
              >
                {appt.status === 'SCHEDULED'
                  ? 'Muayene Bekliyor'
                  : appt.status === 'COMPLETED'
                  ? 'Muayene Edildi'
                  : 'İptal Edildi'}
              </span>
            </div>
            <div className="muted small">
              Klinik: <strong>{appt.clinicName}</strong> · Randevu Saati: {new Date(appt.startAt).toLocaleString('tr-TR')}
            </div>
          </div>
        )}

        <div className="stack" style={{ maxWidth: '900px', margin: '1.5rem auto 0 auto', width: '100%', gap: '1.5rem' }}>
          
          {/* 1. Clinical Note Entry Form */}
          <form className="card stack" onSubmit={saveVisit}>
            <h3>Klinik Not Girişi</h3>
            <label className="field">
              <span>Tanı / Bulgular ve Şikayetler</span>
              <textarea
                rows={4}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Hastanın şikayetleri ve teşhis bulgularını buraya girin..."
              />
            </label>
            <label className="field">
              <span>Uygulanan Tedavi / Reçete Özeti</span>
              <textarea
                rows={4}
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="Uygulanan tedavi, ameliyat veya önerilen ilaçların genel açıklaması..."
              />
            </label>
            
            {info && <div className="alert ok">{info}</div>}
            {error && <div className="alert error">{error}</div>}
            
            <button className="btn primary" type="submit">
              {visit ? 'Muayene Kaydını Güncelle' : 'Muayene Kaydını Başlat / Kaydet'}
            </button>
            
            {visit && (
              <div className="muted small">
                Ziyaret Referans No: <strong>#{visit.id}</strong> (Vezne işlemleri ve ödemeler bu numara üzerinden takip edilir)
              </div>
            )}
          </form>



          {/* 3. Official Report & Prescription Form */}
          <form className="card stack" onSubmit={addDocument}>
            <h3>Resmi Rapor ve Reçete Ekleme</h3>
            <p className="muted small" style={{ margin: 0 }}>Muayene tamamlandıktan sonra hastaya ait resmi reçete veya istirahat raporunu buradan ekleyebilirsiniz.</p>
            <div className="row wrap">
              <label className="field flex">
                <span>Belge Türü</span>
                <select value={docType} onChange={(e) => setDocType(e.target.value as 'REPORT' | 'PRESCRIPTION')}>
                  <option value="REPORT">Sağlık Raporu</option>
                  <option value="PRESCRIPTION">Reçete</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Belge İçeriği / Açıklaması</span>
              <textarea
                rows={5}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Reçete ilaç kodları / kullanım talimatları veya raporun gerekçesi ve süresi..."
                required
              />
            </label>
            <button className="btn secondary" type="submit" disabled={!visit}>
              Belgeyi Kaydet ve Ekle
            </button>
          </form>

          {/* 4. Current Documents List */}
          {docs.length > 0 && (
            <div className="card stack">
              <h3>Muayenede Eklenen Belgeler</h3>
              <ul className="doc-list">
                {docs.map((d) => (
                  <li key={d.id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="row spread" style={{ marginBottom: '0.45rem' }}>
                      <span className={`pill ${d.docType === 'PRESCRIPTION' ? 'ok' : 'subtle'}`}>
                        {d.docType === 'PRESCRIPTION' ? '💊 REÇETE' : '📋 SAĞLIK RAPORU'}
                      </span>
                      <span className="muted small">{new Date(d.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                    <pre className="doc-pre">{d.contentText}</pre>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 5. Hospital-wide Medical History (Moved to Bottom, Ordered Vertically) */}
          <div className="card stack subtle">
            <h3>🏥 Hastanın Sağlık Geçmişi</h3>
            <p className="muted small" style={{ margin: 0 }}>
              Hastanın bu hastanede (tüm polikliniklerde) kayda geçmiş tüm muayenelerinin kronolojik listesidir. Detayları incelemek için ilgili muayeneye tıklayın.
            </p>

            {pastVisitsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                Sağlık geçmişi yükleniyor...
              </div>
            ) : pastVisits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                Hastanın geçmiş muayene kaydı bulunmamaktadır.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {pastVisits.map((pv) => {
                  const isCurrent = pv.appointmentId === apptId
                  return (
                    <div
                      key={pv.id}
                      className="card subtle"
                      onClick={() => void handlePastVisitClick(pv)}
                      style={{
                        cursor: 'pointer',
                        border: isCurrent ? '1.5px solid var(--brand)' : '1px solid #e2e8f0',
                        background: isCurrent ? 'rgba(30, 58, 138, 0.02)' : '#ffffff',
                        transition: 'all 0.2s ease',
                        padding: '1rem',
                        margin: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--brand)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isCurrent ? 'var(--brand)' : '#e2e8f0'
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div className="row spread" style={{ marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--brand-dark)' }}>
                          {pv.clinicName}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }} className="muted">
                          {new Date(pv.visitDate).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <div className="muted small" style={{ marginBottom: '0.5rem' }}>
                        Hekim: <strong>{pv.doctorName}</strong>
                      </div>
                      <div className="small" style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                        📝 <strong>Tanı Notu:</strong> {pv.diagnosisNotes || 'Teşhis notu girilmemiş'}
                      </div>
                      {isCurrent && (
                        <div style={{ marginTop: '0.45rem' }}>
                          <span className="pill tiny ok" style={{ fontSize: '0.7rem' }}>Şu anki Muayene</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Medical History Detail Modal */}
        {selectedPastVisit && createPortal(
          <div
            className="modal-overlay"
            onClick={() => setSelectedPastVisit(null)}
          >
            <div
              className="modal-card stack"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="row spread align-center" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, color: 'var(--brand-dark)' }}>Muayene Geçmiş Detayı</h3>
                <button
                  type="button"
                  className="btn tiny ghost"
                  onClick={() => setSelectedPastVisit(null)}
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                >
                  ✕
                </button>
              </div>

              <div className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
                <div className="row wrap" style={{ gap: '1.5rem' }}>
                  <div>
                    <span className="muted small">Tarih</span>
                    <div><strong>{new Date(selectedPastVisit.visitDate).toLocaleString('tr-TR')}</strong></div>
                  </div>
                  <div>
                    <span className="muted small">Klinik / Poliklinik</span>
                    <div><strong>{selectedPastVisit.clinicName}</strong></div>
                  </div>
                  <div>
                    <span className="muted small">Muayene Eden Hekim</span>
                    <div><strong>{selectedPastVisit.doctorName}</strong></div>
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />

                <div>
                  <span className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanı ve Teşhis Notları</span>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '0.35rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {selectedPastVisit.diagnosisNotes || 'Herhangi bir tanı notu girilmemiş.'}
                  </div>
                </div>

                <div>
                  <span className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uygulanan Tedavi Notları</span>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '0.35rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {selectedPastVisit.treatmentNotes || 'Herhangi bir tedavi notu girilmemiş.'}
                  </div>
                </div>

                <div>
                  <span className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Muayeneye Ait Belgeler</span>
                  {pastVisitDocsLoading ? (
                    <div className="muted small" style={{ padding: '0.5rem 0' }}>Belgeler getiriliyor...</div>
                  ) : pastVisitDocs.length === 0 ? (
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px dashed #cbd5e1', marginTop: '0.35rem', textAlign: 'center' }} className="muted small">
                      Bu muayeneye ait reçete veya sağlık raporu bulunmamaktadır.
                    </div>
                  ) : (
                    <div className="stack" style={{ gap: '0.75rem', marginTop: '0.35rem' }}>
                      {pastVisitDocs.map((d) => (
                        <div key={d.id} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
                          <div className="row spread small" style={{ marginBottom: '0.35rem' }}>
                            <span className="pill subtle" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {d.docType === 'PRESCRIPTION' ? '💊 REÇETE' : '📋 SAĞLIK RAPORU'}
                            </span>
                            <span className="muted">{new Date(d.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{d.contentText}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                <button type="button" className="btn secondary" onClick={() => setSelectedPastVisit(null)}>
                  Kapat
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </RequireRole>
  )
}
