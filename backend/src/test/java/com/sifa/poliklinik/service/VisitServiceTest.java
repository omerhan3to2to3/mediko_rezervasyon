package com.sifa.poliklinik.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.domain.AppointmentStatus;
import com.sifa.poliklinik.domain.ClinicalDocument;
import com.sifa.poliklinik.domain.ClinicalDocumentType;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.domain.VisitRecord;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.ClinicalDocumentRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

/**
 * VisitService birim testleri.
 * Hekim muayene tanı/tedavi girişi, randevu durumu geçişleri ve klinik belge ekleme kontrollerini doğrular.
 * 
 * @author Yılmaz Akkaya (Öğrenci No: 22011020) - Test Sorumlusu & Frontend Geliştirici
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VisitServiceTest {

    @Mock private VisitRecordRepository visitRecordRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private ClinicalDocumentRepository clinicalDocumentRepository;
    @Mock private DoctorContextService doctorContextService;

    @InjectMocks
    private VisitService visitService;

    @Test
    @DisplayName("Randevu muayene kaydı başarıyla girilir ve randevu tamamlanır")
    void upsertForAppointment_basarili() {
        Authentication mockAuth = mock(Authentication.class);
        Doctor mockDoctor = mock(Doctor.class);
        when(mockDoctor.getId()).thenReturn(10L);

        when(doctorContextService.requireDoctor(mockAuth)).thenReturn(mockDoctor);

        Appointment mockAppt = mock(Appointment.class);
        when(mockAppt.getId()).thenReturn(100L);
        when(mockAppt.getStatus()).thenReturn(AppointmentStatus.SCHEDULED);
        when(mockAppt.getDoctor()).thenReturn(mockDoctor);

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(mockAppt));
        when(visitRecordRepository.findByAppointmentId(100L)).thenReturn(Optional.empty());

        VisitRecord mockVisitSaved = mock(VisitRecord.class);
        when(mockVisitSaved.getId()).thenReturn(1L);
        when(mockVisitSaved.getAppointment()).thenReturn(mockAppt);
        when(mockVisitSaved.getDoctor()).thenReturn(mockDoctor);
        when(mockVisitSaved.getDiagnosisNotes()).thenReturn("Teşhis A");
        when(mockVisitSaved.getTreatmentNotes()).thenReturn("Tedavi B");

        when(visitRecordRepository.save(any(VisitRecord.class))).thenReturn(mockVisitSaved);

        VisitRecord result = visitService.upsertForAppointment(100L, "Teşhis A", "Tedavi B", mockAuth);

        assertNotNull(result);
        assertEquals("Teşhis A", result.getDiagnosisNotes());
        assertEquals("Tedavi B", result.getTreatmentNotes());
        verify(mockAppt).setStatus(AppointmentStatus.COMPLETED); // Randevu durumu COMPLETED yapılır
        verify(visitRecordRepository).save(any(VisitRecord.class));
        verify(appointmentRepository).save(mockAppt);
    }

    @Test
    @DisplayName("Başka bir hekime ait randevuya tanı girilmek istendiğinde 403 hata fırlatılır")
    void upsertForAppointment_yetkisizDoktor_hataFirlatir() {
        Authentication mockAuth = mock(Authentication.class);
        Doctor mockDoctor = mock(Doctor.class);
        when(mockDoctor.getId()).thenReturn(10L); // Giriş yapan doktor

        Doctor mockOtherDoctor = mock(Doctor.class);
        when(mockOtherDoctor.getId()).thenReturn(20L); // Randevu sahibi doktor

        when(doctorContextService.requireDoctor(mockAuth)).thenReturn(mockDoctor);

        Appointment mockAppt = mock(Appointment.class);
        when(mockAppt.getDoctor()).thenReturn(mockOtherDoctor);

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(mockAppt));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> visitService.upsertForAppointment(100L, "Teşhis", "Tedavi", mockAuth));
        
        assertEquals(403, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Bu randevu sizin kliniğinize ait değil"));
    }

    @Test
    @DisplayName("Muayene sonrasında klinik reçete başarıyla eklenir")
    void addDocument_basarili() {
        Authentication mockAuth = mock(Authentication.class);
        Doctor mockDoctor = mock(Doctor.class);
        when(mockDoctor.getId()).thenReturn(10L);

        when(doctorContextService.requireDoctor(mockAuth)).thenReturn(mockDoctor);

        VisitRecord mockVisit = mock(VisitRecord.class);
        when(mockVisit.getId()).thenReturn(1L);
        when(mockVisit.getDoctor()).thenReturn(mockDoctor);

        when(visitRecordRepository.findFetchedById(1L)).thenReturn(Optional.of(mockVisit));

        ClinicalDocument mockDocSaved = mock(ClinicalDocument.class);
        when(mockDocSaved.getId()).thenReturn(300L);
        when(mockDocSaved.getVisit()).thenReturn(mockVisit);
        when(mockDocSaved.getDocType()).thenReturn(ClinicalDocumentType.PRESCRIPTION);
        when(mockDocSaved.getContentText()).thenReturn("Aspirin 100mg");

        when(clinicalDocumentRepository.save(any(ClinicalDocument.class))).thenReturn(mockDocSaved);

        ClinicalDocument result = visitService.addDocument(1L, ClinicalDocumentType.PRESCRIPTION, "Aspirin 100mg", mockAuth);

        assertNotNull(result);
        assertEquals(300L, result.getId());
        assertEquals(ClinicalDocumentType.PRESCRIPTION, result.getDocType());
        assertEquals("Aspirin 100mg", result.getContentText());
        verify(clinicalDocumentRepository).save(any(ClinicalDocument.class));
    }

    @Test
    @DisplayName("Muayene sonrasında sevk kâğıdı eklenmek istendiğinde (kapalı özellik) 400 hata fırlatılır")
    void addDocument_sevkKapali_hataFirlatir() {
        Authentication mockAuth = mock(Authentication.class);
        Doctor mockDoctor = mock(Doctor.class);
        when(mockDoctor.getId()).thenReturn(10L);

        when(doctorContextService.requireDoctor(mockAuth)).thenReturn(mockDoctor);

        VisitRecord mockVisit = mock(VisitRecord.class);
        when(mockVisit.getId()).thenReturn(1L);
        when(mockVisit.getDoctor()).thenReturn(mockDoctor);

        when(visitRecordRepository.findFetchedById(1L)).thenReturn(Optional.of(mockVisit));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> visitService.addDocument(1L, ClinicalDocumentType.REFERRAL, "Devlet Hastanesine Sevk", mockAuth));
        
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Sevk kâğıdı şu an kullanıma kapalı"));
    }
}
