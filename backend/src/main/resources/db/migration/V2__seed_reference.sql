INSERT INTO clinic (name, active) VALUES
    ('Göz', TRUE),
    ('Üroloji', TRUE),
    ('Ortopedi', TRUE),
    ('Psikiyatri', TRUE);

INSERT INTO doctor (clinic_id, app_user_id, full_name, active) VALUES
    (1, NULL, 'Dr. Ayşe Yılmaz', TRUE),
    (2, NULL, 'Dr. Mehmet Kaya', TRUE),
    (3, NULL, 'Dr. Zeynep Demir', TRUE),
    (4, NULL, 'Dr. Can Öztürk', TRUE);

INSERT INTO service_catalog (code, description, unit_price) VALUES
    ('CONSULT', 'Muayene ücreti', 750.00),
    ('FOLLOWUP', 'Kontrol muayenesi', 400.00),
    ('ECG', 'Basit tetkik paketi', 250.00);
