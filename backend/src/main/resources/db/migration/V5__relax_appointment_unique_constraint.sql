ALTER TABLE appointment DROP CONSTRAINT uk_doctor_slot;

CREATE UNIQUE INDEX uk_doctor_slot ON appointment (doctor_id, start_at) WHERE status <> 'CANCELLED';
