package com.sifa.poliklinik.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.sifa.poliklinik.domain.AppUser;
import com.sifa.poliklinik.domain.Patient;
import com.sifa.poliklinik.repository.AppUserRepository;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.PatientRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

/**
 * PatientService birim testleri.
 * Hasta oluşturma, sorgulama ve doğrulama mantığını test eder.
 * 
 * @author Ömerhan Sancak (Öğrenci No: 22011002) - DB Sorumlusu & Backend Geliştirici
 */
@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    @Mock
    private PatientRepository patientRepository;
    @Mock
    private AppUserRepository appUserRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private DoctorContextService doctorContextService;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private PatientService patientService;

    private AppUser testUser;

    @BeforeEach
    void setUp() {
        testUser = new AppUser();
        testUser.setUsername("kayitci1");
    }

    @Test
    @DisplayName("Yeni hasta başarıyla oluşturulur")
    void create_basarili() {
        when(patientRepository.existsByTcKimlik("12345678901")).thenReturn(false);
        when(patientRepository.existsByPhone("5551234567")).thenReturn(false);
        when(patientRepository.existsByEmail("test@mail.com")).thenReturn(false);
        when(authentication.getName()).thenReturn("kayitci1");
        when(appUserRepository.findByUsername("kayitci1")).thenReturn(Optional.of(testUser));
        when(patientRepository.save(any(Patient.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Patient result = patientService.create("12345678901", "Ali", "Yılmaz", "5551234567", "test@mail.com", authentication);

        assertNotNull(result);
        assertEquals("12345678901", result.getTcKimlik());
        assertEquals("Ali", result.getFirstName());
        assertEquals("Yılmaz", result.getLastName());
        assertEquals("5551234567", result.getPhone());
        assertEquals("test@mail.com", result.getEmail());
        assertEquals(testUser, result.getCreatedBy());
        verify(patientRepository).save(any(Patient.class));
    }

    @Test
    @DisplayName("Aynı TC ile kayıt edilmeye çalışıldığında CONFLICT hatası fırlatılır")
    void create_ayniTc_conflictHatasi() {
        when(patientRepository.existsByTcKimlik("12345678901")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                patientService.create("12345678901", "Ali", "Yılmaz", "555", "e@m.c", authentication));

        assertTrue(ex.getReason().contains("zaten kayıtlı"));
    }

    @Test
    @DisplayName("Aynı telefon numarası ile kayıt edilmeye çalışıldığında CONFLICT hatası fırlatılır")
    void create_ayniTelefon_conflictHatasi() {
        when(patientRepository.existsByTcKimlik("99988877766")).thenReturn(false);
        when(patientRepository.existsByPhone("5559999999")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                patientService.create("99988877766", "Mehmet", "Kaya", "5559999999", null, authentication));

        assertTrue(ex.getReason().contains("telefon"));
    }

    @Test
    @DisplayName("Hasta ID ile başarıyla sorgulanır")
    void get_varolanHasta_basarili() {
        Patient mockPatient = new Patient();
        mockPatient.setTcKimlik("11111111111");
        mockPatient.setFirstName("Test");
        mockPatient.setLastName("Hasta");
        when(patientRepository.findById(1L)).thenReturn(Optional.of(mockPatient));

        Patient result = patientService.get(1L);

        assertNotNull(result);
        assertEquals("11111111111", result.getTcKimlik());
        assertEquals("Test", result.getFirstName());
    }

    @Test
    @DisplayName("Kayıtlı olmayan hasta ID sorgulandığında NOT_FOUND fırlatılır")
    void get_kayitsizHasta_notFound() {
        when(patientRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> patientService.get(999L));
    }

    @Test
    @DisplayName("TC Kimlik ile hasta başarıyla sorgulanır")
    void getByTc_basarili() {
        Patient mockPatient = new Patient();
        mockPatient.setTcKimlik("22222222222");
        mockPatient.setFirstName("Ayşe");
        when(patientRepository.findByTcKimlik("22222222222")).thenReturn(Optional.of(mockPatient));

        Patient result = patientService.getByTc("22222222222");

        assertNotNull(result);
        assertEquals("Ayşe", result.getFirstName());
    }

    @Test
    @DisplayName("Kayıtlı olmayan TC ile sorgulandığında NOT_FOUND fırlatılır")
    void getByTc_kayitsiz_notFound() {
        when(patientRepository.findByTcKimlik("00000000000")).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> patientService.getByTc("00000000000"));
    }
}
