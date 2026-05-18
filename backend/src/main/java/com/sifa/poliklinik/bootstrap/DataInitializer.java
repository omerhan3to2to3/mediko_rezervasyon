package com.sifa.poliklinik.bootstrap;

import com.sifa.poliklinik.domain.AppUser;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.domain.Role;
import com.sifa.poliklinik.repository.AppUserRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final AppUserRepository appUserRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            AppUserRepository appUserRepository, DoctorRepository doctorRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.doctorRepository = doctorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String raw = "ChangeMe123!";
        if (!appUserRepository.existsByUsername("admin")) {
            createUser("admin", raw, EnumSet.of(Role.ADMIN));
        }
        if (appUserRepository.count() > 1) {
            return;
        }
        createUser("kayit", raw, EnumSet.of(Role.REGISTRATION_CLERK));
        createUser("randevu", raw, EnumSet.of(Role.APPOINTMENT_CLERK));
        createUser("vezne", raw, EnumSet.of(Role.CASHIER));
        AppUser drGoz = createUser("dr.goz", raw, EnumSet.of(Role.DOCTOR));
        AppUser drUro = createUser("dr.uro", raw, EnumSet.of(Role.DOCTOR));
        AppUser drOrt = createUser("dr.ort", raw, EnumSet.of(Role.DOCTOR));
        AppUser drPsi = createUser("dr.psi", raw, EnumSet.of(Role.DOCTOR));

        List<Doctor> doctors = doctorRepository.findAll().stream().sorted(java.util.Comparator.comparing(Doctor::getId)).toList();
        if (doctors.size() >= 4) {
            doctors.get(0).setAppUser(drGoz);
            doctors.get(1).setAppUser(drUro);
            doctors.get(2).setAppUser(drOrt);
            doctors.get(3).setAppUser(drPsi);
            doctorRepository.saveAll(doctors);
        }

        log.info(
                "Demo kullanıcıları oluşturuldu (şifre: {}). Yönetim: admin. Doktorlar: dr.goz, dr.uro, dr.ort, dr.psi",
                raw);
    }

    private AppUser createUser(String username, String rawPassword, Set<Role> roles) {
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        u.setEnabled(true);
        u.setRoles(EnumSet.copyOf(roles));
        return appUserRepository.save(u);
    }
}
