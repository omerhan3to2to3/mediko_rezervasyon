import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { RequireRole } from '../components/RequireRole'
import { apiFetch, isApiError } from '../api/http'

type CatalogItem = { id: number; code: string; description: string; unitPrice: number }

type BillingSummary = {
  visitId: number | null
  appointmentId: number
  patientId: number
  patientTcKimlik: string
  patientFullName: string
  grossTotal: number
  lines: {
    id: number
    serviceCode: string
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }[]
  paid: boolean
  discountAmount?: number
  netAmount?: number
  paymentMethod?: string | null
  diagnosisNotes?: string | null
  treatmentNotes?: string | null
}

type Preview = {
  coverageRatePercent: number
  message: string
  estimatedDiscount: number
  grossHint: number
}

type PaymentResponse = {
  id: number
  visitId: number
  grossAmount: number
  discountAmount: number
  netAmount: number
  method: 'CASH' | 'CARD'
  coverageRateSnapshot: number | null
  paidAt: string
}

type Appointment = {
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
  visitId?: number | null
  paid?: boolean
}

export function CashierPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  
  // Catalog fields for adding new item
  const [newServiceCode, setNewServiceCode] = useState('')
  const [newServiceDescription, setNewServiceDescription] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  
  // Catalog inline editing fields
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editPrice, setEditPrice] = useState('')

  // Selected appointment billing summary state
  const [appointmentId, setAppointmentId] = useState('')
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [serviceId, setServiceId] = useState<number | ''>('')
  const [qty, setQty] = useState(1)
  const [tcQuery, setTcQuery] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // TC Search and list states
  const [searchTc, setSearchTc] = useState('')
  const [searchedOnce, setSearchedOnce] = useState(false)
  const [trackStatus, setTrackStatus] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [apptsLoading, setApptsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Load initial data
  useEffect(() => {
    void loadCatalog()
  }, [])

  async function fetchAppointmentsForTc(tcVal: string) {
    if (tcVal.length !== 11) return
    setApptsLoading(true)
    setSearchedOnce(true)
    setMsg(null)
    try {
      const data = await apiFetch<Appointment[]>(
        `/api/appointments/by-tc/${encodeURIComponent(tcVal.trim())}`
      )
      setAppointments(data ?? [])
      setCurrentPage(1)
    } catch (err) {
      console.error('Randevu arama hatası:', err)
      setAppointments([])
      setMsg(isApiError(err) ? err.detail : 'Randevular yüklenirken hata oluştu')
    } finally {
      setApptsLoading(false)
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    void fetchAppointmentsForTc(searchTc)
  }

  // Render 11 dots remaining counter
  const renderDots = (value: string, maxLen: number = 11) => {
    const remaining = Math.max(0, maxLen - value.length)
    return (
      <div style={{ display: 'flex', gap: '5px', marginTop: '6px', alignItems: 'center', justifyContent: 'center' }}>
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

  async function loadCatalog() {
    try {
      const c = await apiFetch<CatalogItem[]>('/api/service-catalog')
      setCatalog(c ?? [])
    } catch {
      setCatalog([])
    }
  }

  async function loadSummaryForId(appId: number) {
    setMsg(null)
    setPayment(null)
    setPreview(null)
    setAppointmentId(String(appId))
    try {
      const s = await apiFetch<BillingSummary>(`/api/cashier/appointments/${appId}/billing-summary`)
      if (!s) {
        setMsg('Özet alınamadı.')
        return
      }
      setSummary(s)
      setTcQuery(s.patientTcKimlik)
    } catch (err: unknown) {
      setSummary(null)
      setMsg(isApiError(err) ? err.detail : 'Özet yüklenemedi')
    }
  }

  async function addLine(e: FormEvent) {
    e.preventDefault()
    const id = Number(appointmentId)
    if (!Number.isFinite(id) || serviceId === '') return
    setMsg(null)
    try {
      await apiFetch(`/api/cashier/appointments/${id}/billing-lines`, {
        method: 'POST',
        body: JSON.stringify({ serviceCatalogId: serviceId, quantity: qty }),
      })
      await loadSummaryForId(id)
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Kalem eklenemedi')
    }
  }

  async function runPreview(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const gross = summary != null ? String(summary.grossTotal) : '0'
    try {
      const p = await apiFetch<Preview>('/api/cashier/insurance-preview', {
        method: 'POST',
        body: JSON.stringify({ tcKimlik: tcQuery.trim(), grossHint: gross }),
      })
      setPreview(p)
    } catch (err: unknown) {
      setPreview(null)
      setMsg(isApiError(err) ? err.detail : 'Sigorta sorgusu başarısız')
    }
  }

  async function pay(method: 'CASH' | 'CARD') {
    const id = Number(appointmentId)
    setMsg(null)
    try {
      const payRes = await apiFetch<PaymentResponse>(`/api/cashier/appointments/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify({ method, tcKimlikForInsuranceQuery: tcQuery.trim() }),
      })
      if (!payRes) {
        setMsg('Ödeme yanıtı alınamadı.')
        return
      }
      setPayment(payRes)
      await loadSummaryForId(id)
      await fetchAppointmentsForTc(searchTc) // Refresh list to update status
      setMsg('Ödeme başarıyla kaydedildi.')
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Ödeme başarısız')
    }
  }

  async function addServiceType(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const unitPrice = Number(newServicePrice.replace(',', '.'))
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setMsg('Fiyat 0’dan büyük bir sayı olmalıdır.')
      return
    }
    try {
      await apiFetch('/api/service-catalog', {
        method: 'POST',
        body: JSON.stringify({
          code: newServiceCode.trim().toUpperCase(),
          description: newServiceDescription.trim(),
          unitPrice,
        }),
      })
      setMsg('Yeni tedavi türü eklendi.')
      setNewServiceCode('')
      setNewServiceDescription('')
      setNewServicePrice('')
      await loadCatalog()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Tedavi türü eklenemedi')
    }
  }

  async function saveCatalogEdit(c: CatalogItem) {
    setMsg(null)
    const price = Number(editPrice.replace(',', '.'))
    if (!Number.isFinite(price) || price <= 0) {
      setMsg('Fiyat 0’dan büyük bir sayı olmalıdır.')
      return
    }
    try {
      await apiFetch(`/api/service-catalog/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          code: c.code,
          description: editDesc.trim(),
          unitPrice: price,
        }),
      })
      setEditingCatalogId(null)
      setMsg('Tedavi türü güncellendi.')
      await loadCatalog()
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Tedavi türü güncellenemedi')
    }
  }

  function startCatalogEdit(c: CatalogItem) {
    setEditingCatalogId(c.id)
    setEditDesc(c.description)
    setEditPrice(String(c.unitPrice))
  }

  function cancelCatalogEdit() {
    setEditingCatalogId(null)
    setEditDesc('')
    setEditPrice('')
  }

  // Filter daily list in memory (only completed appointments can be paid)
  const filteredAppointments = appointments.filter((app) => {
    if (app.status !== 'COMPLETED') return false
    if (trackStatus === 'PAID') return app.paid === true
    if (trackStatus === 'UNPAID') return app.paid !== true
    return true
  })

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [trackStatus])

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage)
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <RequireRole role="CASHIER">
      <div className="page">
        <h2>Vezne İşlemleri Paneli</h2>
        <p className="muted">
          Hastanın T.C. Kimlik numarasını sorgulayarak muayenesi tamamlanmış randevularını görebilir, tedavi kalemi ekleyerek fatura tahsilatı yapabilirsiniz.
        </p>

        {/* Centered T.C. Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0 2rem 0' }}>
          <div className="card stack" style={{ width: '100%', maxWidth: '560px', textAlign: 'center', padding: '1.75rem 2rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Hasta T.C. Kimlik No ile Sorgula</h3>
            <p className="muted small" style={{ marginBottom: '1.25rem', marginTop: '0.25rem' }}>
              Hastanın randevularını listelemek için 11 haneli T.C. Kimlik numarasını giriniz.
            </p>
            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div className="field" style={{ width: '100%', maxWidth: '340px', textAlign: 'left', margin: 0 }}>
                <input
                  type="text"
                  value={searchTc}
                  onChange={(e) => setSearchTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="11 Haneli T.C. Kimlik No"
                  maxLength={11}
                  style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 600, padding: '0.6rem' }}
                />
                {renderDots(searchTc, 11)}
              </div>
              <button
                type="submit"
                className="btn primary"
                style={{ padding: '0.6rem 1.75rem', fontSize: '0.95rem', minWidth: '160px', marginTop: '0.5rem' }}
                disabled={apptsLoading || searchTc.length !== 11}
              >
                {apptsLoading ? 'Sorgulanıyor...' : 'Randevuları Listele'}
              </button>
            </form>
          </div>
        </div>

        {/* Main Workspace (Single Column Centered Layout) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
          
          {/* 1. Appointments list for lookup */}
          {searchedOnce && (
            <div className="card stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>Randevu Geçmişi ve Durumları</h3>
                <label className="field" style={{ margin: 0, minWidth: '180px', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="muted small" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>Filtrele:</span>
                  <select value={trackStatus} onChange={(e) => setTrackStatus(e.target.value as 'ALL' | 'PAID' | 'UNPAID')}>
                    <option value="ALL">Tümü</option>
                    <option value="PAID">Ödenenler</option>
                    <option value="UNPAID">Ödenmeyenler</option>
                  </select>
                </label>
              </div>

              {apptsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                  Randevular yükleniyor...
                </div>
              ) : paginatedAppointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted)', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  Aradığınız T.C. numarasına ait muayenesi tamamlanmış (ödeme alınabilir) randevu kaydı bulunamadı.
                </div>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Randevu ID</th>
                          <th>Hasta Adı Soyadı</th>
                          <th>Hasta T.C. No</th>
                          <th>Tarih & Saat</th>
                          <th>Doktor & Poliklinik</th>
                          <th>Muayene Durumu</th>
                          <th>Ödeme Durumu</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAppointments.map((app) => (
                          <tr key={app.id} style={{ background: summary?.appointmentId === app.id ? 'rgba(30, 58, 138, 0.04)' : undefined }}>
                            <td style={{ fontWeight: 600 }}>#{app.id}</td>
                            <td style={{ fontWeight: 500 }}>{app.patientName}</td>
                            <td className="small">{app.patientTc}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <strong>{new Date(app.startAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong><br />
                              <span className="small muted">{new Date(app.startAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td>
                              <strong>{app.doctorName}</strong> <br />
                              <span className="small muted">{app.clinicName}</span>
                            </td>
                            <td>
                              <span className={`pill ${app.status === 'COMPLETED' ? 'ok' : app.status === 'SCHEDULED' ? 'subtle' : 'warn'}`}>
                                {app.status === 'SCHEDULED' ? 'Muayene Bekliyor' : app.status === 'COMPLETED' ? 'Muayene Edildi' : 'İptal Edildi'}
                              </span>
                            </td>
                            <td>
                              <span className={`pill ${app.paid ? 'ok' : 'warn'}`}>
                                {app.paid ? 'Ödendi' : 'Ödenmedi'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`btn tiny ${summary?.appointmentId === app.id ? 'primary' : 'secondary'}`}
                                onClick={() => void loadSummaryForId(app.id)}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {summary?.appointmentId === app.id ? 'Seçili' : 'Seç'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                      <button
                        className="btn tiny secondary"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        ◀ Önceki
                      </button>
                      <span className="muted small">
                        Sayfa <strong>{currentPage}</strong> / {totalPages}
                      </span>
                      <button
                        className="btn tiny secondary"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      >
                        Sonraki ▶
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 2. Billing Details & Payment Section */}
          <div className="stack">
            {summary ? (
              <>
                <div className="card subtle-card" style={{ borderLeft: '4px solid var(--brand)', padding: '1rem 1.25rem', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{summary.patientFullName}</h4>
                      <span className="small muted">T.C. Kimlik No: {summary.patientTcKimlik}</span>
                    </div>
                    <div>
                      {summary.paid ? (
                        <span className="pill ok" style={{ fontWeight: 600 }}>🟢 Ödendi</span>
                      ) : (
                        <span className="pill warn" style={{ fontWeight: 600 }}>🔴 Ödenmedi</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Doctor's Visit Summary / Clinical Notes */}
                {(summary.diagnosisNotes || summary.treatmentNotes) && (
                  <div className="card stack subtle-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.25rem' }}>
                    <h4 style={{ margin: 0, color: '#166534', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🩺 Hekim Muayene Notları & Teşhis Bulguları
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      {summary.diagnosisNotes && (
                        <div>
                          <strong style={{ color: '#14532d' }}>Tanı / Bulgular ve Şikayetler:</strong>
                          <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #dcfce7', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                            {summary.diagnosisNotes}
                          </div>
                        </div>
                      )}
                      {summary.treatmentNotes && (
                        <div>
                          <strong style={{ color: '#14532d' }}>Uygulanan Tedavi / Öneri:</strong>
                          <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #dcfce7', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                            {summary.treatmentNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Add Billing line services */}
                {!summary.paid && (
                  <div className="card stack">
                    <h3>Tedavi & Hizmet Kalemi Ekle</h3>
                    <form className="row wrap" onSubmit={addLine} style={{ alignItems: 'flex-end', gap: '0.5rem' }}>
                      <label className="field flex" style={{ margin: 0 }}>
                        <span>Hizmet Türü</span>
                        <select value={serviceId} onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : '')} required>
                          <option value="">Seçin...</option>
                          {catalog.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} — {c.description} ({c.unitPrice} ₺)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field narrow" style={{ margin: 0, width: '80px' }}>
                        <span>Adet</span>
                        <input
                          type="number"
                          min={1}
                          value={qty}
                          onChange={(e) => setQty(Number(e.target.value))}
                          required
                        />
                      </label>
                      <button className="btn primary" type="submit">
                        Ekle
                      </button>
                    </form>
                  </div>
                )}

                {/* Billing breakdown summary */}
                <div className="card stack">
                  <h3>Fiyat & Kalem Dökümü</h3>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Kod</th>
                          <th>Açıklama</th>
                          <th>Adet</th>
                          <th className="right">B.Fiyat</th>
                          <th className="right">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.lines.map((l) => (
                          <tr key={l.id}>
                            <td style={{ fontWeight: 600 }}>{l.serviceCode}</td>
                            <td>{l.description}</td>
                            <td>{l.quantity}</td>
                            <td className="right">{l.unitPrice} ₺</td>
                            <td className="right">{l.lineTotal} ₺</td>
                          </tr>
                        ))}
                        {summary.lines.length === 0 && (
                          <tr>
                            <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
                              Henüz eklenmiş fatura kalemi bulunmuyor.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot style={{ background: '#f8fafc' }}>
                        <tr>
                          <td colSpan={4} style={{ fontWeight: 500 }}>Brüt Tutar:</td>
                          <td className="right" style={{ fontWeight: 500 }}>{summary.grossTotal} ₺</td>
                        </tr>
                        
                        {(summary.paid || preview) && (
                          <tr>
                            <td colSpan={4} style={{ color: 'var(--danger)', fontWeight: 600 }}>
                              SGK Sigorta İndirimi {preview && !summary.paid && `(%${preview.coverageRatePercent})`}:
                            </td>
                            <td className="right" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                              - {summary.paid ? summary.discountAmount : preview?.estimatedDiscount} ₺
                            </td>
                          </tr>
                        )}

                        <tr style={{ borderTop: '2px solid #cbd5e1' }}>
                          <td colSpan={4}>
                            <strong style={{ fontSize: '1rem', color: 'var(--brand-dark)' }}>
                              {summary.paid ? 'Tahsil Edilen Net Tutar:' : 'Tahsil Edilecek Net Tutar:'}
                            </strong>
                          </td>
                          <td className="right">
                            <strong style={{ color: 'var(--ok)', fontSize: '1.2rem' }}>
                              {summary.paid
                                ? summary.netAmount
                                : preview
                                ? Math.max(0, summary.grossTotal - preview.estimatedDiscount)
                                : summary.grossTotal}{' '}
                              ₺
                            </strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Mock SGK Insurance lookup */}
                {!summary.paid && (
                  <div className="card stack">
                    <h3>Sosyal Güvenlik Kurumu (SGK) Sigorta Sorgusu</h3>
                    <p className="muted small" style={{ margin: 0 }}>
                      Hastanın T.C. numarası ile SGK veri tabanından sorgulama yaparak sigorta kapsamındaki indirim oranını hesaplayabilirsiniz.
                    </p>
                    <form className="row wrap" onSubmit={runPreview} style={{ alignItems: 'flex-end', gap: '0.5rem' }}>
                      <label className="field flex" style={{ margin: 0 }}>
                        <span>Sorgulanacak T.C. Kimlik</span>
                        <input value={tcQuery} onChange={(e) => setTcQuery(e.target.value.replace(/\D/g, ''))} pattern="\d{11}" maxLength={11} required />
                      </label>
                      <button type="submit" className="btn secondary">
                        Sigorta Sorgula
                      </button>
                    </form>
                    {preview && (
                      <div className="alert subtle" style={{ borderLeft: '4px solid var(--brand)', background: 'rgba(30, 58, 138, 0.02)', padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--brand-dark)' }}>
                          🎯 SGK Kapsam Oranı: %{preview.coverageRatePercent}
                        </div>
                        <div className="muted small" style={{ marginTop: '4px' }}>
                          {preview.message} <br />
                          <strong>Tahmini İndirim:</strong> {preview.estimatedDiscount} ₺
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Collection Action */}
                <div className="card stack" style={{ border: summary.paid ? '1px solid var(--ok-border)' : '1.5px solid var(--brand)', background: summary.paid ? 'rgba(16, 185, 129, 0.01)' : undefined }}>
                  <h3>{summary.paid ? 'Tahsilat Makbuzu' : 'Ödeme Tahsilat İşlemi'}</h3>
                  {summary.paid ? (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                      <div className="receipt-ticket" style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                        width: '100%',
                        maxWidth: '430px',
                        padding: '1.75rem',
                        fontFamily: 'monospace, Courier, sans-serif',
                        color: '#1e293b',
                        position: 'relative',
                        borderTop: '5px solid var(--brand)',
                      }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#0f172a', letterSpacing: '1px' }}>ŞİFA SAĞLIK GRUBU</h3>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>VEZNE TAHSİLAT MAKBUZU</span>
                        </div>

                        {/* Date and Receipt ID */}
                        <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tarih & Saat:</span>
                            <span>{new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Makbuz No:</span>
                            <span>#MS-{summary.appointmentId}-{summary.visitId ?? 0}</span>
                          </div>
                        </div>

                        {/* Patient & Appointment Info */}
                        <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Hasta Adı:</span>
                            <span style={{ fontWeight: 'bold' }}>{summary.patientFullName.toUpperCase()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>T.C. Kimlik No:</span>
                            <span>{summary.patientTcKimlik}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Randevu No:</span>
                            <span>#{summary.appointmentId}</span>
                          </div>
                        </div>

                        {/* Services List */}
                        <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>HİZMET DETAYLARI</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {summary.lines.map((l) => (
                              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span>{l.description} (x{l.quantity})</span>
                                <span>{l.lineTotal} ₺</span>
                              </div>
                            ))}
                            {summary.lines.length === 0 && (
                              <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>Hizmet kalemi bulunmamaktadır.</div>
                            )}
                          </div>
                        </div>

                        {/* Payment Totals */}
                        <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Brüt Tutar:</span>
                            <span>{summary.grossTotal} ₺</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                            <span>SGK Sigorta İndirimi:</span>
                            <span>-{summary.discountAmount} ₺</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', borderTop: '2px solid #0f172a', paddingTop: '0.5rem', marginTop: '0.25rem', color: '#0f172a' }}>
                            <span>TAHSİL EDİLEN:</span>
                            <span>{summary.netAmount} ₺</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                            <span>Ödeme Tipi:</span>
                            <span>
                              {payment?.method === 'CARD' || summary?.paymentMethod === 'CARD'
                                ? '💳 KREDİ KARTI'
                                : payment?.method === 'CASH' || summary?.paymentMethod === 'CASH'
                                ? '💵 NAKİT'
                                : '📋 KAYITLI ÖD.'}
                            </span>
                          </div>
                        </div>

                        {/* Barcode and thank you */}
                        <div style={{ textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', height: '32px', marginBottom: '0.25rem', opacity: 0.85 }}>
                            <div style={{ width: '2px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '4px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '1px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '3px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '1px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '2px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '4px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '2px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '1px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '3px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '1px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '4px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '2px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '1px', backgroundColor: '#000', height: '100%' }} />
                            <div style={{ width: '3px', backgroundColor: '#000', height: '100%' }} />
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', letterSpacing: '4px', display: 'block', marginBottom: '0.75rem' }}>
                            *SH-{summary.appointmentId}-{summary.patientId}*
                          </span>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#16a34a', fontFamily: 'sans-serif' }}>
                            ✓ ÖDEME ONAYLANDI
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem', fontFamily: 'sans-serif' }}>
                            Geçmiş olsun, sağlıklı günler dileriz.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="muted small" style={{ margin: 0 }}>
                        Lütfen hastadan ödemeyi nakit veya kredi kartı ile tahsil ettikten sonra aşağıdaki butonlardan birini kullanarak onaylayın.
                      </p>
                      <div className="row wrap" style={{ gap: '0.75rem' }}>
                        <button type="button" className="btn primary flex" onClick={() => void pay('CASH')}>
                          💵 Nakit Tahsil Et
                        </button>
                        <button type="button" className="btn primary flex" onClick={() => void pay('CARD')}>
                          💳 Kredi Kartı ile Tahsil Et
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="card stack" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '180px', textAlign: 'center', padding: '2rem', color: 'var(--muted)', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧾</div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>Fatura Detayları</h4>
                <p className="small" style={{ maxWidth: '350px', margin: 0 }}>
                  İşlem yapmak için yukarıdan bir T.C. Kimlik numarası sorgulayın ve listeden bir randevu seçin.
                </p>
              </div>
            )}
          </div>

          {/* 3. Catalog & Treatment Management Section */}
          <div className="stack" style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '2rem', marginTop: '1.5rem' }}>
            <h2 style={{ textAlign: 'center', color: 'var(--brand-dark)' }}>Tedavi Hizmet ve Katalog Yönetimi</h2>
            <p className="muted small" style={{ textAlign: 'center', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
              Sistemde tanımlı olan muayene ve tedavi türlerinin fiyatlarını güncelleyebilir veya yeni hizmet türleri ekleyebilirsiniz.
            </p>

            {/* Add New service type Form */}
            <div className="card stack">
              <h3>Yeni Tedavi/Hizmet Türü Ekle</h3>
              <form className="stack" onSubmit={addServiceType}>
                <div className="row wrap" style={{ gap: '0.5rem' }}>
                  <label className="field flex" style={{ flex: 1 }}>
                    <span>Hizmet Kodu</span>
                    <input
                      value={newServiceCode}
                      onChange={(e) => setNewServiceCode(e.target.value.toUpperCase())}
                      placeholder="Örn: MRI_BRAIN"
                      maxLength={15}
                      required
                    />
                  </label>
                  <label className="field flex" style={{ flex: 2 }}>
                    <span>Açıklama (Hizmet Adı)</span>
                    <input
                      value={newServiceDescription}
                      onChange={(e) => setNewServiceDescription(e.target.value)}
                      placeholder="Örn: Beyin Emarı Çekimi"
                      required
                    />
                  </label>
                </div>
                <div className="row wrap" style={{ gap: '0.5rem', alignItems: 'flex-end' }}>
                  <label className="field flex">
                    <span>Birim Fiyatı (₺)</span>
                    <input
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      required
                    />
                  </label>
                  <button type="submit" className="btn secondary" style={{ minWidth: '120px' }}>
                    Kataloğa Ekle
                  </button>
                </div>
              </form>
            </div>

            {/* Service Catalog List & Editor */}
            <div className="card stack">
              <h3>Tedavi & Hizmet Kataloğu</h3>
              <p className="muted small" style={{ margin: 0 }}>
                Sistemde tanımlı tedaviler ve muayene ücretleri listesi. Fiyat değişikliklerinde doğrudan tablodan <strong>Düzenle</strong> seçeneğini kullanabilirsiniz.
              </p>

              <div className="table-wrap" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Hizmet Tanımı</th>
                      <th className="right" style={{ width: '130px' }}>Fiyat</th>
                      <th style={{ width: '110px' }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((c) => {
                      const isEditing = editingCatalogId === c.id

                      return (
                        <tr key={c.id} style={{ background: isEditing ? 'rgba(245, 158, 11, 0.03)' : undefined }}>
                          <td style={{ fontWeight: 700, color: 'var(--brand-dark)' }}>{c.code}</td>
                          <td>
                            {isEditing ? (
                              <input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                style={{ width: '100%', padding: '0.2rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              />
                            ) : (
                              c.description
                            )}
                          </td>
                          <td className="right" style={{ fontWeight: 600 }}>
                            {isEditing ? (
                              <input
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                inputMode="decimal"
                                style={{ width: '90px', padding: '0.2rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }}
                              />
                            ) : (
                              `${c.unitPrice} ₺`
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="btn tiny primary"
                                  onClick={() => void saveCatalogEdit(c)}
                                  style={{ padding: '0.2rem 0.5rem' }}
                                >
                                  Kaydet
                                </button>
                                <button
                                  type="button"
                                  className="btn tiny ghost"
                                  onClick={cancelCatalogEdit}
                                  style={{ padding: '0.2rem 0.5rem' }}
                                >
                                  Vazgeç
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn tiny secondary"
                                onClick={() => startCatalogEdit(c)}
                              >
                                Düzenle
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {msg && <div className={`alert ${msg.includes('başarıyla') || msg.includes('güncellendi') ? 'ok' : 'error'} mt`}>{msg}</div>}
        </div>
      </div>
    </RequireRole>
  )
}
