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

export function CashierPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [newServiceCode, setNewServiceCode] = useState('')
  const [newServiceDescription, setNewServiceDescription] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [appointmentId, setAppointmentId] = useState('')
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [serviceId, setServiceId] = useState<number | ''>('')
  const [qty, setQty] = useState(1)
  const [tcQuery, setTcQuery] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    void loadCatalog()
  }, [])

  async function loadCatalog() {
    try {
      const c = await apiFetch<CatalogItem[]>('/api/service-catalog')
      setCatalog(c ?? [])
    } catch {
      setCatalog([])
    }
  }

  async function loadSummary() {
    setMsg(null)
    setPayment(null)
    const id = Number(appointmentId)
    if (!Number.isFinite(id)) {
      setMsg('Geçerli randevu numarası girin.')
      return
    }
    try {
      const s = await apiFetch<BillingSummary>(`/api/cashier/appointments/${id}/billing-summary`)
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
      await loadSummary()
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
      await loadSummary()
      setMsg('Ödeme kaydedildi.')
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

  return (
    <RequireRole role="CASHIER">
      <div className="page">
        <h2>Vezne</h2>
        <p className="muted">
          Randevu numarası ile işlem ekleyin; önce doktor muayenesi tamamlanmış olmalıdır (ziyaret kaydı).
        </p>

        <div className="card stack">
          <h3>Tedavi türü tanımla</h3>
          <form className="row wrap" onSubmit={addServiceType}>
            <label className="field flex">
              <span>Kod</span>
              <input
                value={newServiceCode}
                onChange={(e) => setNewServiceCode(e.target.value)}
                placeholder="Örn: XRAY"
                required
              />
            </label>
            <label className="field flex">
              <span>Tedavi adı</span>
              <input
                value={newServiceDescription}
                onChange={(e) => setNewServiceDescription(e.target.value)}
                placeholder="Örn: Röntgen çekimi"
                required
              />
            </label>
            <label className="field narrow">
              <span>Fiyat</span>
              <input
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                required
              />
            </label>
            <button type="submit" className="btn secondary">
              Tür ekle
            </button>
          </form>
        </div>

        <div className="card stack mt">
          <h3>Randevu işlemi</h3>
          <label className="field">
            <span>Randevu ID</span>
            <input value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} />
          </label>
          <button type="button" className="btn secondary" onClick={() => void loadSummary()}>
            Özeti yükle
          </button>
          {summary && (
            <div className="pill-row">
              <span className="pill">{summary.patientFullName}</span>
              <span className="pill subtle">TC {summary.patientTcKimlik}</span>
              {summary.paid ? <span className="pill ok">Ödendi</span> : <span className="pill warn">Ödenmedi</span>}
            </div>
          )}
        </div>

        {summary && (
          <>
            <div className="card stack mt">
              <h3>Hizmet kalemi ekle</h3>
              <form className="row wrap" onSubmit={addLine}>
                <label className="field flex">
                  <span>Hizmet</span>
                  <select value={serviceId} onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Seçin</option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.description} ({c.unitPrice} ₺)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field narrow">
                  <span>Adet</span>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                  />
                </label>
                <button className="btn primary" type="submit">
                  Ekle
                </button>
              </form>
            </div>

            <div className="card stack mt">
              <h3>Fiyat özeti</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Açıklama</th>
                      <th>Adet</th>
                      <th className="right">Satır</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.lines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.serviceCode}</td>
                        <td>{l.description}</td>
                        <td>{l.quantity}</td>
                        <td className="right">{l.lineTotal} ₺</td>
                      </tr>
                    ))}
                    {summary.lines.length === 0 && (
                      <tr>
                        <td colSpan={4} className="muted">
                          Henüz kalem yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>
                        <strong>Brüt</strong>
                      </td>
                      <td className="right">
                        <strong>{summary.grossTotal} ₺</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="card stack mt">
              <h3>Sosyal sigorta (mock)</h3>
              <form className="stack" onSubmit={runPreview}>
                <label className="field">
                  <span>TC (sorgu)</span>
                  <input value={tcQuery} onChange={(e) => setTcQuery(e.target.value)} pattern="\d{11}" />
                </label>
                <button type="submit" className="btn secondary">
                  Sorgula
                </button>
              </form>
              {preview && (
                <div className="alert subtle">
                  <div>
                    <strong>%{preview.coverageRatePercent}</strong> — {preview.message}
                  </div>
                  <div className="muted small">
                    Tahmini indirim: {preview.estimatedDiscount} ₺ (brüt {preview.grossHint} ₺ üzerinden)
                  </div>
                </div>
              )}
            </div>

            <div className="card stack mt">
              <h3>Ödeme</h3>
              <div className="row wrap">
                <button type="button" className="btn primary" disabled={summary.paid} onClick={() => void pay('CASH')}>
                  Nakit
                </button>
                <button type="button" className="btn primary" disabled={summary.paid} onClick={() => void pay('CARD')}>
                  Kredi kartı
                </button>
              </div>
              {payment && (
                <div className="alert ok mt">
                  Tahsilat: <strong>{payment.netAmount} ₺</strong> (İndirim {payment.discountAmount} ₺, brüt{' '}
                  {payment.grossAmount} ₺)
                </div>
              )}
            </div>
          </>
        )}

        {msg && <div className="alert error mt">{msg}</div>}
      </div>
    </RequireRole>
  )
}
