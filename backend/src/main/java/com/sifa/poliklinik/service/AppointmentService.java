package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.domain.AppointmentStatus;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.domain.Patient;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import com.sifa.poliklinik.repository.PatientRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorContextService doctorContextService;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository,
            DoctorContextService doctorContextService) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.doctorContextService = doctorContextService;
    }

    @Transactional
    public Appointment create(Long patientId, Long doctorId, Instant startAt) {
        Patient patient =
                patientRepository.findById(patientId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Doctor doctor =
                doctorRepository
                        .findByIdAndActiveTrue(doctorId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Instant endAt = startAt.plus(30, ChronoUnit.MINUTES);
        if (!appointmentRepository.findBlockingForDoctor(doctorId, AppointmentStatus.SCHEDULED, startAt, endAt).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu zaman dilimi dolu");
        }
        Appointment a = new Appointment();
        a.setPatient(patient);
        a.setDoctor(doctor);
        a.setStartAt(startAt);
        a.setEndAt(endAt);
        a.setStatus(AppointmentStatus.SCHEDULED);
        try {
            return appointmentRepository.save(a);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Randevu çakışması");
        }
    }

    @Transactional(readOnly = true)
    public Appointment get(Long id) {
        return appointmentRepository.findDetailById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public Appointment get(Long id, Authentication auth) {
        Appointment a = get(id);
        if (hasRole(auth, "ROLE_DOCTOR")) {
            var doctor = doctorContextService.requireDoctor(auth);
            if (!a.getDoctor().getId().equals(doctor.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
        }
        return a;
    }

    private static boolean hasRole(Authentication auth, String role) {
        return auth != null
                && auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(role::equals);
    }
}
