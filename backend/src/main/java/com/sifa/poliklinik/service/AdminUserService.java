package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.AppUser;
import com.sifa.poliklinik.domain.Clinic;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.domain.Role;
import com.sifa.poliklinik.repository.AppUserRepository;
import com.sifa.poliklinik.repository.ClinicRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import com.sifa.poliklinik.repository.PatientRepository;
import com.sifa.poliklinik.web.dto.AdminCreateClinicRequest;
import com.sifa.poliklinik.web.dto.AdminCreateUserRequest;
import com.sifa.poliklinik.web.dto.AdminUpdateUserRequest;
import com.sifa.poliklinik.web.dto.AdminUserResponseDto;
import java.util.EnumSet;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminUserService {

    private final AppUserRepository appUserRepository;
    private final DoctorRepository doctorRepository;
    private final ClinicRepository clinicRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(
            AppUserRepository appUserRepository,
            DoctorRepository doctorRepository,
            ClinicRepository clinicRepository,
            PatientRepository patientRepository,
            PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.doctorRepository = doctorRepository;
        this.clinicRepository = clinicRepository;
        this.patientRepository = patientRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AdminUserResponseDto create(AdminCreateUserRequest request) {
        if (appUserRepository.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu kullanıcı adı zaten kullanılıyor");
        }
        if (request.roles().size() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bir kullanıcıya yalnızca tek rol atanabilir");
        }
        EnumSet<Role> roles = normalizeRoles(request.roles());
        if (roles.contains(Role.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ADMIN rolü bu ekran üzerinden atanamaz");
        }
        AppUser user = new AppUser();
        user.setUsername(request.username().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setEnabled(true);
        user.setRoles(roles);
        AppUser saved = appUserRepository.save(user);

        Doctor createdDoctor = upsertDoctorForRole(saved, roles, request.clinicId(), request.doctorFullName());
        return map(saved, createdDoctor);
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponseDto> list() {
        return appUserRepository.findAllByOrderByUsernameAsc().stream()
                .map(
                        u -> {
                            Doctor doctor = doctorRepository.findByAppUser_Id(u.getId()).orElse(null);
                            return map(u, doctor);
                        })
                .toList();
    }

    @Transactional
    public AdminUserResponseDto update(Long userId, AdminUpdateUserRequest request, String currentAdminUsername) {
        AppUser user =
                appUserRepository.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (user.getUsername().equals(currentAdminUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kendi hesabınızı bu ekrandan güncelleyemezsiniz");
        }
        String username = request.username().trim();
        appUserRepository
                .findByUsername(username)
                .filter(u -> !u.getId().equals(userId))
                .ifPresent(
                        u -> {
                            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu kullanıcı adı zaten kullanılıyor");
                        });

        EnumSet<Role> roles = normalizeRoles(request.roles());
        if (roles.contains(Role.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ADMIN rolü bu ekran üzerinden atanamaz");
        }
        user.setUsername(username);
        user.setRoles(roles);
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        AppUser saved = appUserRepository.save(user);
        Doctor doctor = upsertDoctorForRole(saved, roles, request.clinicId(), request.doctorFullName());
        return map(saved, doctor);
    }

    @Transactional
    public void delete(Long userId, String currentAdminUsername) {
        AppUser user =
                appUserRepository.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (user.getUsername().equals(currentAdminUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kendi hesabınızı silemezsiniz");
        }
        doctorRepository
                .findByAppUser_Id(userId)
                .ifPresent(
                        doctor -> {
                            doctor.setAppUser(null);
                            doctor.setActive(false);
                            doctorRepository.save(doctor);
                        });
        patientRepository.clearCreatedByForUser(userId);
        appUserRepository.delete(user);
    }

    @Transactional
    public Clinic createClinic(AdminCreateClinicRequest request) {
        Clinic clinic = new Clinic();
        clinic.setName(request.name().trim());
        clinic.setActive(true);
        try {
            return clinicRepository.save(clinic);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu isimde klinik zaten var");
        }
    }

    @Transactional
    public Clinic updateClinic(Long id, AdminCreateClinicRequest request) {
        Clinic clinic = clinicRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Klinik bulunamadı"));
        clinic.setName(request.name().trim());
        try {
            return clinicRepository.save(clinic);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu isimde klinik zaten var");
        }
    }

    @Transactional
    public void deleteClinic(Long id) {
        Clinic clinic = clinicRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Klinik bulunamadı"));
        if (doctorRepository.existsByClinicId(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu kliniğe bağlı hekim(ler) bulunduğundan silinemez.");
        }
        clinicRepository.delete(clinic);
    }


    private static AdminUserResponseDto map(AppUser user, Doctor doctor) {
        var roleNames = user.getRoles().stream().map(Role::name).collect(Collectors.toSet());
        if (doctor == null) {
            return new AdminUserResponseDto(user.getId(), user.getUsername(), roleNames, null, null, null, null);
        }
        return new AdminUserResponseDto(
                user.getId(),
                user.getUsername(),
                roleNames,
                doctor.getId(),
                doctor.getClinic().getId(),
                doctor.getClinic().getName(),
                doctor.getFullName());
    }

    private static EnumSet<Role> normalizeRoles(java.util.Set<Role> roleSet) {
        if (roleSet == null || roleSet.size() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bir kullanıcıya yalnızca tek rol atanabilir");
        }
        return EnumSet.copyOf(roleSet);
    }

    private Doctor upsertDoctorForRole(AppUser user, EnumSet<Role> roles, Long clinicId, String doctorFullName) {
        Doctor existingDoctor = doctorRepository.findByAppUser_Id(user.getId()).orElse(null);
        if (!roles.contains(Role.DOCTOR)) {
            if (existingDoctor != null) {
                existingDoctor.setAppUser(null);
                existingDoctor.setActive(false);
                doctorRepository.save(existingDoctor);
            }
            return null;
        }

        if (clinicId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Doktor rolü için klinik seçimi zorunludur");
        }
        Clinic clinic =
                clinicRepository
                        .findById(clinicId)
                        .filter(Clinic::isActive)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçersiz klinik"));
        String fullName = doctorFullName == null || doctorFullName.isBlank() ? "Dr. " + user.getUsername() : doctorFullName.trim();
        Doctor doctor = existingDoctor != null ? existingDoctor : new Doctor();
        doctor.setClinic(clinic);
        doctor.setAppUser(user);
        doctor.setFullName(fullName);
        doctor.setActive(true);
        return doctorRepository.save(doctor);
    }
}
