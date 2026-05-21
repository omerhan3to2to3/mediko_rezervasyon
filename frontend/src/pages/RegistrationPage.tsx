import type { FormEvent } from 'react'
import { useState } from 'react'
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
  const [tcKimlik, setTcKimlik] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [pending, setPending] = useState(false)

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
    } catch (err: unknown) {
      setMsg(isApiError(err) ? err.detail : 'Kayıt başarısız')
    } finally {
      setPending(false)
    }
  }

  return (
    <RequireRole role="REGISTRATION_CLERK">
      <div className="page">
        <h2>Hasta Kayıt İşlemleri</h2>
        <p className="muted">Muayene olacak hastanın kimlik ve iletişim bilgilerini girin.</p>
        <div className="alert subtle" style={{ borderLeft: '4px solid var(--brand)', background: 'rgba(30, 58, 138, 0.02)', padding: '1rem 1.25rem', marginBottom: '0.5rem' }}>
          💡 <strong>Kurumsal Kayıt Kılavuzu:</strong> Yeni hasta kaydı yaparken T.C. Kimlik numarasının 11 haneli ve benzersiz olduğunu doğrulayınız. Kaydı tamamlanan hastalar anında randevu oluşturma sistemine yansıyacaktır.
        </div>
        <form className="card stack narrow" onSubmit={onSubmit}>
          <label className="field">
            <span>TC kimlik no</span>
            <input value={tcKimlik} onChange={(e) => setTcKimlik(e.target.value)} required pattern="\d{11}" />
          </label>
          <div className="row">
            <label className="field flex">
              <span>Ad</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </label>
            <label className="field flex">
              <span>Soyad</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
          </div>
          <label className="field">
            <span>Telefon</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxxx"
              inputMode="numeric"
              maxLength={11}
              pattern="05\d{9}"
              title="Telefon numarası 05xxxxxxxxx formatında olmalıdır. Örnek: 05321234567"
            />
          </label>
          <label className="field">
            <span>E-posta</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {msg && <div className={`alert ${patient ? 'ok' : 'error'}`}>{msg}</div>}
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </form>
        {patient && (
          <div className="card stack subtle mt">
            <div className="row spread">
              <strong>Yeni hasta</strong>
              <span className="pill">ID: {patient.id}</span>
            </div>
            <div className="muted small">
              {patient.firstName} {patient.lastName} · {patient.tcKimlik}
            </div>
          </div>
        )}
      </div>
    </RequireRole>
  )
}
