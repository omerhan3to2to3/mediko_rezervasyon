package com.sifa.poliklinik.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.sifa.poliklinik.domain.*;
import com.sifa.poliklinik.repository.*;
import com.sifa.poliklinik.web.dto.AdminCreateClinicRequest;
import com.sifa.poliklinik.web.dto.AdminCreateUserRequest;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

/**
 * AdminUserService birim testleri.
 * Kullanıcı oluşturma, klinik yönetimi ve silme iş mantığını doğrular.
 * 
 * @author Yılmaz Akkaya (Öğrenci No: 22011020) - Test Sorumlusu & Frontend Geliştirici
 */
@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock private AppUserRepository appUserRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private ClinicRepository clinicRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminUserService adminUserService;

    @Test
    @DisplayName("Yeni klinik başarıyla oluşturulur")
    void createClinic_basarili() {
        AdminCreateClinicRequest request = new AdminCreateClinicRequest("Göz Hastalıkları");
        when(clinicRepository.save(any(Clinic.class))).thenAnswer(inv -> inv.getArgument(0));

        Clinic result = adminUserService.createClinic(request);

        assertNotNull(result);
        assertEquals("Göz Hastalıkları", result.getName());
        assertTrue(result.isActive());
        verify(clinicRepository).save(any(Clinic.class));
    }

    @Test
    @DisplayName("Hekim bağlı olmayan klinik başarıyla silinir")
    void deleteClinic_hekimsiz_basarili() {
        Clinic clinic = new Clinic();
        clinic.setName("Boş Klinik");
        when(clinicRepository.findById(1L)).thenReturn(Optional.of(clinic));
        when(doctorRepository.existsByClinicId(1L)).thenReturn(false);

        assertDoesNotThrow(() -> adminUserService.deleteClinic(1L));
        verify(clinicRepository).delete(clinic);
    }

    @Test
    @DisplayName("Hekim bağlı klinik silinmeye çalışıldığında hata fırlatılır")
    void deleteClinic_hekimli_hata() {
        Clinic clinic = new Clinic();
        clinic.setName("Dolu Klinik");
        when(clinicRepository.findById(2L)).thenReturn(Optional.of(clinic));
        when(doctorRepository.existsByClinicId(2L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> adminUserService.deleteClinic(2L));

        assertTrue(ex.getReason().contains("hekim"));
        verify(clinicRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Klinik adı başarıyla güncellenir")
    void updateClinic_basarili() {
        Clinic clinic = new Clinic();
        clinic.setName("Eski Ad");
        when(clinicRepository.findById(5L)).thenReturn(Optional.of(clinic));
        when(clinicRepository.save(any(Clinic.class))).thenAnswer(inv -> inv.getArgument(0));

        Clinic result = adminUserService.updateClinic(5L, new AdminCreateClinicRequest("Yeni Ad"));

        assertEquals("Yeni Ad", result.getName());
    }

    @Test
    @DisplayName("Var olmayan klinik güncellenmeye çalışıldığında NOT_FOUND fırlatılır")
    void updateClinic_olmayan_notFound() {
        when(clinicRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> adminUserService.updateClinic(99L, new AdminCreateClinicRequest("Test")));
    }

    @Test
    @DisplayName("Admin kendi hesabını silmeye çalıştığında hata fırlatılır")
    void delete_kendiHesabini_hata() {
        AppUser admin = new AppUser();
        admin.setUsername("admin1");
        when(appUserRepository.findById(1L)).thenReturn(Optional.of(admin));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> adminUserService.delete(1L, "admin1"));

        assertTrue(ex.getReason().contains("Kendi"));
    }
}
