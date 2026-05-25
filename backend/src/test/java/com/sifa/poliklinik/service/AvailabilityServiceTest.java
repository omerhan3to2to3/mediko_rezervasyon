package com.sifa.poliklinik.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.sifa.poliklinik.config.ClinicScheduleProperties;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import com.sifa.poliklinik.web.dto.AvailabilityDoctorSlotsDto;
import com.sifa.poliklinik.web.dto.AlternativeDateDto;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/**
 * AvailabilityService birim testleri.
 * Klinik hekimlerinin boş slotlarının ve alternatif uygun tarihlerin hesaplanmasını doğrular.
 * 
 * @author Emre Erçin (Öğrenci No: 22011095) - UI/UX Sorumlusu & Frontend Geliştirici
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AvailabilityServiceTest {

    @Mock private ClinicScheduleProperties schedule;
    @Mock private DoctorRepository doctorRepository;
    @Mock private AppointmentRepository appointmentRepository;

    @InjectMocks
    private AvailabilityService availabilityService;

    @BeforeEach
    void setUp() {
        when(schedule.getSlotMinutes()).thenReturn(30);
        when(schedule.getDayStart()).thenReturn(LocalTime.of(9, 0));
        when(schedule.getDayEnd()).thenReturn(LocalTime.of(17, 0));
        when(schedule.getLunchStart()).thenReturn(LocalTime.of(12, 0));
        when(schedule.getLunchEnd()).thenReturn(LocalTime.of(13, 0));
        when(schedule.getAlternativeDaysRange()).thenReturn(14);
    }

    @Test
    @DisplayName("Hafta içi iş günü için hekimlerin boş slotları başarıyla hesaplanır")
    void availabilityForClinic_basarili() {
        LocalDate monday = LocalDate.of(2026, 6, 1); // Pazartesi

        Doctor mockDoctor = mock(Doctor.class);
        when(mockDoctor.getId()).thenReturn(10L);
        when(mockDoctor.getFullName()).thenReturn("Dr. Emre Test");

        when(doctorRepository.findByClinicIdAndActiveTrue(1L)).thenReturn(List.of(mockDoctor));
        
        // Çakışan hiçbir randevu yok (tüm saatler boş)
        when(appointmentRepository.findBlockingForDoctor(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        List<AvailabilityDoctorSlotsDto> result = availabilityService.availabilityForClinic(1L, monday);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Dr. Emre Test", result.get(0).doctorName());
        
        // 09:00 - 12:00 arası 6 slot, 13:00 - 17:00 arası 8 slot = Toplam 14 slot olmalı
        assertEquals(14, result.get(0).slots().size());
    }

    @Test
    @DisplayName("Hafta sonu günleri için hiçbir randevu slotu oluşturulmaz, boş liste döner")
    void availabilityForClinic_haftasonu_bosListe() {
        LocalDate saturday = LocalDate.of(2026, 6, 6); // Cumartesi

        List<AvailabilityDoctorSlotsDto> result = availabilityService.availabilityForClinic(1L, saturday);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verifyNoInteractions(doctorRepository);
    }

    @Test
    @DisplayName("Gelecek uygun iş günleri için alternatif randevu tarihleri önerilir")
    void alternativeDates_basarili() {
        LocalDate monday = LocalDate.of(2026, 6, 1);

        Doctor mockDoctor = mock(Doctor.class);
        when(mockDoctor.getId()).thenReturn(10L);
        when(doctorRepository.findByClinicIdAndActiveTrue(1L)).thenReturn(List.of(mockDoctor));
        
        // Sadece boş slot sorgulamalarında boş liste döndürsün (randevu bulunamadı)
        when(appointmentRepository.findBlockingForDoctor(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        List<AlternativeDateDto> suggestions = availabilityService.alternativeDates(1L, monday, 3);

        assertNotNull(suggestions);
        assertFalse(suggestions.isEmpty());
        // En fazla 3 adet öneri istedik: Salı, Çarşamba, Perşembe günleri önerilmelidir (cumartesi-pazar atlanarak)
        assertTrue(suggestions.size() <= 3);
        
        // Önerilen günlerin tamamı boş slotlara sahip olmalı
        for (AlternativeDateDto dto : suggestions) {
            assertTrue(dto.suggestedSlotCount() > 0);
            assertNotEquals(java.time.DayOfWeek.SATURDAY, dto.date().getDayOfWeek());
            assertNotEquals(java.time.DayOfWeek.SUNDAY, dto.date().getDayOfWeek());
        }
    }
}
