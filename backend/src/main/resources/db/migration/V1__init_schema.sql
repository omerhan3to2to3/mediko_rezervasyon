CREATE TABLE clinic (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE app_user_role (
    user_id BIGINT NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE TABLE doctor (
    id BIGSERIAL PRIMARY KEY,
    clinic_id BIGINT NOT NULL REFERENCES clinic (id),
    app_user_id BIGINT UNIQUE REFERENCES app_user (id) ON DELETE SET NULL,
    full_name VARCHAR(160) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_doctor_clinic ON doctor (clinic_id);

CREATE TABLE patient (
    id BIGSERIAL PRIMARY KEY,
    tc_kimlik VARCHAR(11) NOT NULL UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    phone VARCHAR(40),
    email VARCHAR(120),
    created_by_user_id BIGINT REFERENCES app_user (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointment (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patient (id),
    doctor_id BIGINT NOT NULL REFERENCES doctor (id),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    CONSTRAINT chk_appointment_status CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    CONSTRAINT uk_doctor_slot UNIQUE (doctor_id, start_at)
);

CREATE INDEX idx_appointment_patient ON appointment (patient_id);
CREATE INDEX idx_appointment_doctor_time ON appointment (doctor_id, start_at);

CREATE TABLE visit_record (
    id BIGSERIAL PRIMARY KEY,
    appointment_id BIGINT NOT NULL UNIQUE REFERENCES appointment (id),
    doctor_id BIGINT NOT NULL REFERENCES doctor (id),
    diagnosis_notes TEXT,
    treatment_notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clinical_document (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT NOT NULL REFERENCES visit_record (id) ON DELETE CASCADE,
    doc_type VARCHAR(32) NOT NULL,
    content_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_doc_type CHECK (doc_type IN ('REPORT', 'PRESCRIPTION', 'REFERRAL'))
);

CREATE INDEX idx_clinical_document_visit ON clinical_document (visit_id);

CREATE TABLE service_catalog (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE billing_line (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT NOT NULL REFERENCES visit_record (id) ON DELETE CASCADE,
    service_catalog_id BIGINT NOT NULL REFERENCES service_catalog (id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price_snapshot NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0)
);

CREATE INDEX idx_billing_line_visit ON billing_line (visit_id);

CREATE TABLE payment (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT NOT NULL UNIQUE REFERENCES visit_record (id),
    gross_amount NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(12, 2) NOT NULL,
    method VARCHAR(16) NOT NULL,
    insurance_tc_snapshot VARCHAR(11),
    coverage_rate_snapshot INT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payment_method CHECK (method IN ('CASH', 'CARD'))
);
