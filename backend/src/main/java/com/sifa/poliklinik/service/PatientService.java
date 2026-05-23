package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.AppUser;
import com.sifa.poliklinik.domain.Patient;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.AppUserRepository;
import com.sifa.poliklinik.repository.PatientRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final AppUserRepository appUserRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorContextService doctorContextService;

    public PatientService(
            PatientRepository patientRepository,
            AppUserRepository appUserRepository,
            AppointmentRepository appointmentRepository,
            DoctorContextService doctorContextService) {
        this.patientRepository = patientRepository;
        this.appUserRepository = appUserRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorContextService = doctorContextService;
    }

    @Transactional
    public Patient create(String tcKimlik, String firstName, String lastName, String phone, String email, Authentication auth) {
        if (patientRepository.existsByTcKimlik(tcKimlik)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu TC ile hasta zaten kayıtlı");
        }
        if (phone != null && !phone.isBlank() && patientRepository.existsByPhone(phone.trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu telefon numarası ile kayıtlı bir hasta zaten var");
        }
        if (email != null && !email.isBlank() && patientRepository.existsByEmail(email.trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu e-posta adresi ile kayıtlı bir hasta zaten var");
        }
        AppUser creator =
                appUserRepository.findByUsername(auth.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Patient p = new Patient();
        p.setTcKimlik(tcKimlik);
        p.setFirstName(firstName);
        p.setLastName(lastName);
        p.setPhone(phone);
        p.setEmail(email);
        p.setCreatedBy(creator);
        return patientRepository.save(p);
    }

    @Transactional(readOnly = true)
    public Patient get(Long id) {
        return patientRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public Patient get(Long id, Authentication auth) {
        Patient p = get(id);
        if (hasRole(auth, "ROLE_DOCTOR")) {
            var doctor = doctorContextService.requireDoctor(auth);
            if (!appointmentRepository.existsByPatient_IdAndDoctor_Id(id, doctor.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu hasta kaydına erişim yetkiniz yok");
            }
        }
        return p;
    }

    @Transactional(readOnly = true)
    public Patient getByTc(String tc) {
        return patientRepository.findByTcKimlik(tc).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public Patient getByTc(String tc, Authentication auth) {
        Patient p = getByTc(tc);
        if (hasRole(auth, "ROLE_DOCTOR")) {
            var doctor = doctorContextService.requireDoctor(auth);
            if (!appointmentRepository.existsByPatient_IdAndDoctor_Id(p.getId(), doctor.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu hasta kaydına erişim yetkiniz yok");
            }
        }
        return p;
    }

    @Transactional(readOnly = true)
    public List<Patient> search(String q, Authentication auth) {
        String term = (q == null) ? "" : q.trim();
        if (hasRole(auth, "ROLE_DOCTOR")) {
            var doctor = doctorContextService.requireDoctor(auth);
            return patientRepository.searchForDoctor(doctor.getId(), term);
        }
        if (term.isEmpty()) {
            return patientRepository.findAll();
        }
        return patientRepository.search(term);
    }

    private static boolean hasRole(Authentication auth, String role) {
        return auth != null
                && auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(role::equals);
    }

    @Transactional
    public Patient update(Long id, String firstName, String lastName, String phone, String email, Authentication auth) {
        Patient p = get(id);
        if (hasRole(auth, "ROLE_DOCTOR")) {
            var doctor = doctorContextService.requireDoctor(auth);
            if (!appointmentRepository.existsByPatient_IdAndDoctor_Id(id, doctor.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu hasta için size ait randevu bulunmuyor");
            }
        }
        if (phone != null && !phone.isBlank()) {
            Optional<Patient> existingPhone = patientRepository.findByPhone(phone.trim());
            if (existingPhone.isPresent() && !existingPhone.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu telefon numarası başka bir hastaya ait");
            }
        }
        if (email != null && !email.isBlank()) {
            Optional<Patient> existingEmail = patientRepository.findByEmail(email.trim());
            if (existingEmail.isPresent() && !existingEmail.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu e-posta adresi başka bir hastaya ait");
            }
        }
        p.setFirstName(firstName);
        p.setLastName(lastName);
        p.setPhone(phone);
        p.setEmail(email);
        return patientRepository.save(p);
    }
}
