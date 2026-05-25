package com.sifa.poliklinik.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.domain.AppointmentStatus;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.domain.Patient;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import com.sifa.poliklinik.repository.PatientRepository;
import com.sifa.poliklinik.repository.PaymentRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.server.ResponseStatusException;

/**
 * AppointmentService birim testleri.
 * Randevu planlama, çakışma kontrolleri ve iptal süreçlerini doğrular.
 * 
 * @author Ömerhan Sancak (Öğrenci No: 22011002) - DB Sorumlusu & Backend Geliştirici
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AppointmentServiceTest {

    @Mock private AppointmentRepository appointmentRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private DoctorContextService doctorContextService;
    @Mock private VisitRecordRepository visitRecordRepository;
    @Mock private PaymentRepository paymentRepository;

    @InjectMocks
    private AppointmentService appointmentService;

    @Test
    @DisplayName("Randevu başarıyla oluşturulur")
    void create_basarili() {
        Patient mockPatient = mock(Patient.class);
        when(mockPatient.getId()).thenReturn(1L);

        Doctor mockDoctor = mock(Doctor.class);
        when(mockDoctor.getId()).thenReturn(2L);

        Instant start = Instant.parse("2026-06-01T09:00:00Z");
        Instant end = start.plus(30, ChronoUnit.MINUTES);

        when(patientRepository.findById(1L)).thenReturn(Optional.of(mockPatient));
        when(doctorRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(mockDoctor));
        
        // Çakışan randevu yok
        when(appointmentRepository.findBlockingForDoctor(2L, AppointmentStatus.SCHEDULED, start, end))
                .thenReturn(Collections.emptyList());

        Appointment mockSaved = mock(Appointment.class);
        when(mockSaved.getId()).thenReturn(100L);
        when(mockSaved.getPatient()).thenReturn(mockPatient);
        when(mockSaved.getDoctor()).thenReturn(mockDoctor);
        when(mockSaved.getStartAt()).thenReturn(start);
        when(mockSaved.getEndAt()).thenReturn(end);
        when(mockSaved.getStatus()).thenReturn(AppointmentStatus.SCHEDULED);

        when(appointmentRepository.save(any(Appointment.class))).thenReturn(mockSaved);

        Appointment result = appointmentService.create(1L, 2L, start);

        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals(AppointmentStatus.SCHEDULED, result.getStatus());
        assertEquals(start, result.getStartAt());
        assertEquals(end, result.getEndAt());
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    @DisplayName("Hasta bulunamazsa randevu oluşturulamaz, 404 hata fırlatılır")
    void create_hastaBulunamadi_hataFirlatir() {
        Instant start = Instant.parse("2026-06-01T09:00:00Z");
        when(patientRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> appointmentService.create(1L, 2L, start));
    }

    @Test
    @DisplayName("Hekim bulunamazsa veya aktif değilse randevu oluşturulamaz, 404 hata fırlatılır")
    void create_hekimBulunamadi_hataFirlatir() {
        Patient mockPatient = mock(Patient.class);
        Instant start = Instant.parse("2026-06-01T09:00:00Z");

        when(patientRepository.findById(1L)).thenReturn(Optional.of(mockPatient));
        when(doctorRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> appointmentService.create(1L, 2L, start));
    }

    @Test
    @DisplayName("Aynı zaman diliminde çakışan randevu varsa randevu oluşturulamaz, 409 hata fırlatılır")
    void create_cakisma_hataFirlatir() {
        Patient mockPatient = mock(Patient.class);
        Doctor mockDoctor = mock(Doctor.class);
        Instant start = Instant.parse("2026-06-01T09:00:00Z");
        Instant end = start.plus(30, ChronoUnit.MINUTES);

        when(patientRepository.findById(1L)).thenReturn(Optional.of(mockPatient));
        when(doctorRepository.findByIdAndActiveTrue(2L)).thenReturn(Optional.of(mockDoctor));

        // Eş zamanlı randevu var
        Appointment conflictAppt = mock(Appointment.class);
        when(appointmentRepository.findBlockingForDoctor(2L, AppointmentStatus.SCHEDULED, start, end))
                .thenReturn(List.of(conflictAppt));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> appointmentService.create(1L, 2L, start));
        
        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Bu zaman dilimi dolu"));
    }

    @Test
    @DisplayName("Randevu başarıyla iptal edilir (silinir)")
    void cancel_basarili() {
        Appointment mockAppt = mock(Appointment.class);
        when(mockAppt.getId()).thenReturn(100L);
        when(mockAppt.getStatus()).thenReturn(AppointmentStatus.SCHEDULED);

        when(appointmentRepository.findDetailById(100L)).thenReturn(Optional.of(mockAppt));

        Appointment result = appointmentService.cancel(100L);

        assertNotNull(result);
        assertEquals(100L, result.getId());
        verify(appointmentRepository).delete(mockAppt);
    }

    @Test
    @DisplayName("Tamamlanmış randevular iptal edilemez, 400 hata fırlatılır")
    void cancel_tamamlanmisRandevu_hataFirlatir() {
        Appointment mockAppt = mock(Appointment.class);
        when(mockAppt.getId()).thenReturn(100L);
        when(mockAppt.getStatus()).thenReturn(AppointmentStatus.COMPLETED);

        when(appointmentRepository.findDetailById(100L)).thenReturn(Optional.of(mockAppt));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> appointmentService.cancel(100L));
        
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Tamamlanmış randevu iptal edilemez"));
    }
}
