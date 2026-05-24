# Şifa Polikliniği Bilgi Sistemi - UML Modelleme ve Tasarım Dokümantasyonu

Bu doküman, Şifa Polikliniği Bilgi Sistemi (ŞPYS) projesinin nesneye yönelik analiz ve tasarım süreçlerinde elde edilen UML (Unified Modeling Language) diyagramlarını, operasyon sözleşmelerini ve sınıf düzeyi izlenebilirlik haritalarını içerir. Diyagramlar Mermaid formatında standartlara uygun olarak çizilmiştir.

---

## 1. Kullanım Senaryosu (Use Case) Modellemesi

Sistemde yer alan 5 dış aktörün (Kayıt Görevlisi, Randevu Görevlisi, Doktor, Veznedar ve Sistem Yöneticisi) sistem sınırları içindeki temel işlevlerle etkileşimi aşağıda şematize edilmiştir.

```mermaid
graph LR
    KG[Kayit Görevlisi]
    RG[Randevu Görevlisi]
    D[Doktor / Hekim]
    V[Veznedar / Kasiyer]
    A[Sistem Yoneticisi / Admin]

    subgraph "Sifa Poliklinigi Bilgi Sistemi (Sistem Siniri)"
        UC1([Hasta Kaydi Islemleri])
        UC2([Hasta Bilgisi Guncelleme])
        UC3([Randevu Sorgulama])
        UC4([Randevu Rezervasyonu])
        UC5([Randevu Iptali])
        UC6([Muayene Kaydi & Tani Girisi])
        UC7([Klinik Belge Yukleme])
        UC8([Gecmis Muayene Sorgulama])
        UC9([Fatura Detaylandirma])
        UC10([Odeme Tahsilati])
        UC11([Kullanici Yonetimi])
        UC12([Klinik Yonetimi])
        UC13([Sistem Raporlari])
    end

    KG --> UC1
    KG --> UC2

    RG --> UC3
    RG --> UC4
    RG --> UC5

    D --> UC6
    D --> UC7
    D --> UC8

    V --> UC9
    V --> UC10

    A --> UC11
    A --> UC12
    A --> UC13
```

### Kullanım Senaryosu Metinleri ve Operasyon Sözleşmeleri (Use Case Contracts)

#### Operasyon Sözleşmesi 1: Randevu Oluşturma (createAppointment)
*   **Operasyon:** `create(patientId, doctorId, startAt)`
*   **Tasarlayan Sorumlu Sınıf:** `AppointmentService`
*   **Ön Koşullar:**
    1.  T.C. Kimlik numarasına sahip hasta sistemde kayıtlı olmalıdır (`patientRepository.findById(patientId)` mevcut olmalı).
    2.  Hekim sistemde aktif olmalıdır (`doctorRepository.findByIdAndActiveTrue(doctorId)` mevcut olmalı).
    3.  Seçilen zaman dilimi dolu olmamalıdır (belirtilen hekim için o saatte çakışan randevu bulunmamalıdır).
*   **Son Koşullar:**
    1.  Veritabanında `SCHEDULED` (Muayene Bekliyor) durumunda yeni bir `Appointment` nesnesi oluşturuldu ve kaydedildi.
    2.  Randevunun başlangıç (`startAt`) ve bitiş (`endAt` = startAt + 30 dk) zaman damgaları atandı.

#### Operasyon Sözleşmesi 2: Ödeme Tahsilatı (collectPayment)
*   **Operasyon:** `collect(visitId, tcKimlikForInsuranceQuery, method)`
*   **Tasarlayan Sorumlu Sınıf:** `PaymentService`
*   **Ön Koşullar:**
    1.  İlgili muayene ziyareti (`VisitRecord`) mevcut olmalıdır.
    2.  Ziyaret için daha önce ödeme tahsil edilmemiş olmalıdır (`paymentRepository.existsByVisitId(visitId)` false olmalı).
    3.  Faturaya eklenmiş en az bir adet geçerli tedavi/hizmet kalemi (`BillingLine`) bulunmalıdır.
*   **Son Koşullar:**
    1.  `InsuranceMockService.quote` yardımıyla T.C. Kimlik sorgusu yapıldı ve indirim oranı hesaplandı.
    2.  Brüt tutar üzerinden sigorta indirimi düşülerek hastanın ödeyeceği Net Tutar hesaplandı.
    3.  `Payment` nesnesi oluşturulup `method` (CASH veya CARD) bilgisiyle kaydedildi.
    4.  Randevunun mali durumu kapatıldı.

---

## 2. Alan Sınıfı (Domain Class) Diyagramı

Sistemde veri tabanında saklanan nesneleri (Varlıklar/Entities) ve aralarındaki kardinalite ilişkilerini gösteren alan sınıfı diyagramıdır.

```mermaid
classDiagram
    AppUser "1" --> "0..*" Patient : "creates"
    Clinic "1" --> "0..*" Doctor : "has"
    Doctor "1" --> "0..*" Appointment : "attends"
    Patient "1" --> "0..*" Appointment : "books"
    Appointment "1" --> "0..1" VisitRecord : "leads to"
    VisitRecord "1" --> "0..*" ClinicalDocument : "contains"
    VisitRecord "1" --> "0..*" BillingLine : "has items"
    ServiceCatalog "1" --> "0..*" BillingLine : "references"
    VisitRecord "1" --> "0..1" Payment : "settled by"

    class AppUser {
        +Long id
        +String username
        +String password
        +Role role
        +String fullName
    }
    class Clinic {
        +Long id
        +String name
        +boolean active
    }
    class Doctor {
        +Long id
        +String fullName
        +boolean active
    }
    class Patient {
        +Long id
        +String tcKimlik
        +String firstName
        +String lastName
        +String phone
        +String email
        +Instant createdAt
    }
    class Appointment {
        +Long id
        +Instant startAt
        +Instant endAt
        +AppointmentStatus status
    }
    class VisitRecord {
        +Long id
        +String diagnosisNotes
        +String treatmentNotes
        +Instant createdAt
    }
    class ClinicalDocument {
        +Long id
        +ClinicalDocumentType type
        +String content
        +Instant createdAt
    }
    class BillingLine {
        +Long id
        +int quantity
        +BigDecimal unitPriceSnapshot
    }
    class ServiceCatalog {
        +Long id
        +String code
        +String description
        +BigDecimal unitPrice
    }
    class Payment {
        +Long id
        +BigDecimal grossAmount
        +BigDecimal discountAmount
        +BigDecimal netAmount
        +PaymentMethod method
        +String insuranceTcSnapshot
        +int coverageRateSnapshot
        +Instant paidAt
    }
```

---

## 3. Tasarım Sınıf (Design Class) Diyagramı

İş mantığı sınıflarının, denetleyicilerin ve veritabanı erişim arayüzlerinin metot imzalarını ve birbirlerine olan bağımlılık yönlerini gösteren mimari diyagramdır.

```mermaid
classDiagram
    PatientController --> PatientService
    AppointmentController --> AppointmentService
    AppointmentController --> AvailabilityService
    BillingController --> BillingService
    PaymentController --> PaymentService
    AdminController --> AdminUserService
    PaymentService --> InsuranceMockService

    class PatientController {
        +create(dto, auth) Patient
        +search(q, auth) List
        +update(id, dto, auth) Patient
    }
    class AppointmentController {
        +create(dto) Appointment
        +list(date, tc) List
        +cancel(id) Appointment
    }
    class BillingController {
        +addLine(dto) BillingLine
        +getSummary(visitId) BillingSummaryDto
        +deleteLine(lineId) void
    }
    class PaymentController {
        +collect(dto) Payment
    }
    class AdminController {
        +createClinic(dto) Clinic
        +updateClinic(id, dto) Clinic
        +deleteClinic(id) void
        +getReportData(start, end) List
    }
    class PatientService {
        -PatientRepository repo
        +create(tc, name, phone, email, auth) Patient
        +get(id) Patient
        +search(q, auth) List
    }
    class AppointmentService {
        -AppointmentRepository repo
        +create(patientId, doctorId, startAt) Appointment
        +cancel(id) Appointment
        +listAppointments(date, tc) List
    }
    class AvailabilityService {
        -ClinicScheduleProperties schedule
        +availabilityForClinic(clinicId, date) List
        +alternativeDates(clinicId, date, max) List
    }
    class BillingService {
        -BillingLineRepository lineRepo
        +addLine(visitId, serviceId, qty) BillingLine
        +summarize(visitId) BillingSummaryDto
    }
    class PaymentService {
        -PaymentRepository payRepo
        -InsuranceMockService insurance
        +collect(visitId, tc, method) Payment
    }
    class InsuranceMockService {
        +quote(tc) InsuranceQuote
        +discountAmount(gross, rate) BigDecimal
    }
    class AdminUserService {
        -ClinicRepository clinicRepo
        +createClinic(dto) Clinic
        +deleteClinic(id) void
    }
```

---

## 4. Tasarım Sıralama (Sequence) Diyagramları

### A. Randevu Rezervasyonu Akışı
Zaman dilimi sorgusu ve ardından hekime randevu kaydı oluşturulması sırasındaki nesneler arası mesajlaşma akışıdır.

```mermaid
sequenceDiagram
    autonumber
    actor RG as Randevu Görevlisi
    participant UI as React (AppointmentPage)
    participant AC as AppointmentController
    participant AS as AppointmentService
    participant AR as AppointmentRepository
    participant DB as PostgreSQL

    RG->>UI: Hekim ve Tarih Seçimi Yapar
    UI->>AC: GET /api/availability/clinic/{id}?date=...
    AC->>AS: listAppointments(date, doctorId)
    AS->>AR: findBlockingForDoctor(...)
    AR->>DB: SELECT FROM appointment
    DB-->>AR: Dolu Randevu Nesneleri
    AR-->>AS: List<Appointment>
    AS-->>AC: Boş/Dolu Slot Bilgileri
    AC-->>UI: 200 OK (Slot Listesi)
    UI-->>RG: MHRS Kırmızı/Beyaz Izgara Şeması
    RG->>UI: Boş Saate Tıklar ve Kaydeder
    UI->>AC: POST /api/appointments (patientId, doctorId, startAt)
    AC->>AS: create(patientId, doctorId, startAt)
    AS->>AR: save(new Appointment)
    AR->>DB: INSERT INTO appointment
    DB-->>AS: Randevu Kaydedildi
    AS-->>AC: Appointment Nesnesi
    AC-->>UI: 201 Created
    UI-->>RG: "Randevu başarıyla alındı" uyarısı
```

### B. Fatura Kalemi Ekleme ve Ödeme Tahsilatı Akışı
Muayenesi biten hastanın fatura kalemlerinin oluşturulması, sigorta indirimi uygulanması ve nakit/kart tahsilat adımlarıdır.

```mermaid
sequenceDiagram
    autonumber
    actor V as Veznedar (Kasiyer)
    participant UI as React (BillingPage)
    participant BC as BillingController
    participant PC as PaymentController
    participant BS as BillingService
    participant PS as PaymentService
    participant INS as InsuranceMockService
    participant DB as PostgreSQL

    V->>UI: Tamamlanan Muayeneleri Listeler
    UI->>BC: GET /api/billing/appointments?date=...
    BC-->>UI: Muayenesi Biten Hasta Satırları
    V->>UI: Hasta Satırına Tıklar ve Teşhis Notlarına Göre Tedavi Seçer
    UI->>BC: POST /api/billing/lines (visitId, serviceCatalogId, quantity)
    BC->>BS: addLine(visitId, serviceCatalogId, quantity)
    BS->>DB: INSERT INTO billing_line
    DB-->>BS: Kalem Eklendi
    BS-->>BC: BillingLine Nesnesi
    BC-->>UI: Güncellenmiş Fatura Kalemleri (Brüt Tutar)
    V->>UI: Ödeme Tahsil Et Butonuna Basar (Nakit/Kart seçer)
    UI->>PC: POST /api/payments (visitId, paymentMethod)
    PC->>PS: collect(visitId, null, method)
    PS->>INS: quote(tcKimlik)
    INS-->>PS: İndirim Oranı (Örn: %50)
    PS->>PS: Net Tutar Hesabı (Brüt - İndirim)
    PS->>DB: INSERT INTO payment
    DB-->>PS: Ödeme Tamamlandı
    PS-->>PC: Payment DTO
    PC-->>UI: 200 OK (İşlem Başarılı)
    UI-->>V: Termal Barkodlu Fiş Görünümü Çizdirilir (Makbuz)
```

---

## 5. Durum (State) Diyagramı

Bir Randevu kaydının sisteme girilmesinden faturalandırılıp ödenmesine kadar olan durum geçişlerini gösterir.

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED : "Randevu Olusturuldu"
    
    state SCHEDULED {
        [*] --> MuayeneBekleme
        MuayeneBekleme --> RandevuIptal : "Iptal Talebi"
    }

    RandevuIptal --> [*] : "Fiziksel Silme"
    
    MuayeneBekleme --> COMPLETED : "Muayene Tamamlandi"
    
    state COMPLETED {
        [*] --> FaturaOlusmamis
        FaturaOlusmamis --> HizmetKalemleriGirilmis : "Hizmet Ekleme"
        HizmetKalemleriGirilmis --> PaidState : "Odeme Tahsilati"
    }
    
    PaidState --> [*] : "Dosya Kapatildi"
```

---

## 6. Etkinlik (Activity) Diyagramı

Hastanın polikliniğe girişinden işlemlerini tamamlayıp ayrılmasına kadar süren uçtan uca iş akış şemasıdır.

```mermaid
graph TD
    subgraph "Kayit Birimi"
        PatientArrival[Hasta Poliklinige Gelir]
        CheckReg{T.C. Kimlik Sorgulamasi Yapilir}
        CreatePatient[Yeni Hasta Kaydi Yapilir]
    end

    subgraph "Randevu Birimi"
        ChooseSlot[Tarih ve Hekim MHRS Gridinden Secilir]
        SaveAppt[Randevu Kaydedilir]
    end

    subgraph "Poliklinik Muayene Birimi"
        WaitQueue[Hasta Muayene Sirasini Bekler]
        Examine[Hekim Muayene Eder]
        WriteNotes[Tani ve Tedavi Notlari Sisteme Girilir]
        UploadDoc[Ilac Recetesi veya Rapor Eklenir]
    end

    subgraph "Vezne ve Kasa Birimi"
        AddBillingItems[Veznedar Tedavi Hizmetlerini Secer]
        CheckInsurance[SGK/Sigorta Kapsami Sorgulanir]
        CalculateTotal[Indirimli Tutar Hesaplanir]
        CollectMoney[Odeme Alinir ve Fatura Kapatilir]
    end

    Start([Baslangic]) --> PatientArrival
    PatientArrival --> CheckReg
    CheckReg -->|Hasta Kayitli Degil| CreatePatient
    CheckReg -->|Hasta Kayitli| ChooseSlot
    CreatePatient --> ChooseSlot
    ChooseSlot --> SaveAppt
    SaveAppt --> WaitQueue
    WaitQueue --> Examine
    Examine --> WriteNotes
    WriteNotes --> UploadDoc
    UploadDoc --> AddBillingItems
    AddBillingItems --> CheckInsurance
    CheckInsurance --> CalculateTotal
    CalculateTotal --> CollectMoney
    CollectMoney --> End([Hasta Poliklinikten Ayrilir])
```
