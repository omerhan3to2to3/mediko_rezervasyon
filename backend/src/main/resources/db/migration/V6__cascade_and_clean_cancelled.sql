-- Drop old constraints
ALTER TABLE visit_record DROP CONSTRAINT IF EXISTS visit_record_appointment_id_fkey;
ALTER TABLE payment DROP CONSTRAINT IF EXISTS payment_visit_id_fkey;

-- Recreate constraints with ON DELETE CASCADE
ALTER TABLE visit_record ADD CONSTRAINT visit_record_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointment(id) ON DELETE CASCADE;
ALTER TABLE payment ADD CONSTRAINT payment_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visit_record(id) ON DELETE CASCADE;

-- Delete any existing CANCELLED appointments
DELETE FROM appointment WHERE status = 'CANCELLED';
