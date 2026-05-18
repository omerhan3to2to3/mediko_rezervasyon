CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Existing users may be referenced by patient.created_by_user_id.
UPDATE patient SET created_by_user_id = NULL;
UPDATE doctor SET app_user_id = NULL;

DELETE FROM app_user;

INSERT INTO app_user (username, password_hash, enabled)
VALUES
    ('admin1', crypt('ChangeMe123!', gen_salt('bf')), TRUE),
    ('kayit1', crypt('ChangeMe123!', gen_salt('bf')), TRUE),
    ('randevu1', crypt('ChangeMe123!', gen_salt('bf')), TRUE),
    ('vezne1', crypt('ChangeMe123!', gen_salt('bf')), TRUE),
    ('dr1', crypt('ChangeMe123!', gen_salt('bf')), TRUE),
    ('dr2', crypt('ChangeMe123!', gen_salt('bf')), TRUE);

INSERT INTO app_user_role (user_id, role)
SELECT id, 'ADMIN' FROM app_user WHERE username = 'admin1';

INSERT INTO app_user_role (user_id, role)
SELECT id, 'REGISTRATION_CLERK' FROM app_user WHERE username = 'kayit1';

INSERT INTO app_user_role (user_id, role)
SELECT id, 'APPOINTMENT_CLERK' FROM app_user WHERE username = 'randevu1';

INSERT INTO app_user_role (user_id, role)
SELECT id, 'CASHIER' FROM app_user WHERE username = 'vezne1';

INSERT INTO app_user_role (user_id, role)
SELECT id, 'DOCTOR' FROM app_user WHERE username IN ('dr1', 'dr2');

WITH doctor_targets AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM doctor
    WHERE active = TRUE
),
doctor_users AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY username) AS rn
    FROM app_user
    WHERE username IN ('dr1', 'dr2')
)
UPDATE doctor d
SET app_user_id = u.id
FROM doctor_targets t
JOIN doctor_users u ON u.rn = t.rn
WHERE d.id = t.id AND t.rn <= 2;
