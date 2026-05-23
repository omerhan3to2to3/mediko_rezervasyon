package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.domain.AppointmentStatus;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.domain.Patient;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import com.sifa.poliklinik.repository.PatientRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import com.sifa.poliklinik.repository.PaymentRepository;
import com.sifa.poliklinik.web.dto.AppointmentResponseDto;
import com.sifa.poliklinik.web.DtoMapper;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
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
    private final VisitRecordRepository visitRecordRepository;
    private final PaymentRepository paymentRepository;

    private static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository,
            DoctorContextService doctorContextService,
            VisitRecordRepository visitRecordRepository,
            PaymentRepository paymentRepository) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.doctorContextService = doctorContextService;
        this.visitRecordRepository = visitRecordRepository;
        this.paymentRepository = paymentRepository;
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

    @Transactional(readOnly = true)
    public List<AppointmentResponseDto> listAppointments(LocalDate date, String tc) {
        Instant start = date.atStartOfDay(ZONE).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(ZONE).toInstant();
        List<Appointment> appts;
        if (tc != null && !tc.isBlank()) {
            appts = appointmentRepository.findByPatient_TcKimlikAndStartAtBetweenOrderByIdDesc(tc.trim(), start, end);
        } else {
            appts = appointmentRepository.findByStartAtBetweenOrderByIdDesc(start, end);
        }

        if (appts.isEmpty()) {
            return List.of();
        }

        var visits = visitRecordRepository.findByAppointmentIn(appts);
        var payments = paymentRepository.findByVisitIn(visits);

        var apptToVisitMap = visits.stream().collect(java.util.stream.Collectors.toMap(
                v -> v.getAppointment().getId(),
                com.sifa.poliklinik.domain.VisitRecord::getId,
                (v1, v2) -> v1
        ));

        var paidVisitIds = payments.stream().map(p -> p.getVisit().getId()).collect(java.util.stream.Collectors.toSet());

        return appts.stream().map(a -> {
            Long visitId = apptToVisitMap.get(a.getId());
            boolean paid = visitId != null && paidVisitIds.contains(visitId);
            return DtoMapper.appointment(a, visitId, paid);
        }).toList();
    }

    @Transactional
    public Appointment cancel(Long id) {
        Appointment a = appointmentRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (a.getStatus() == AppointmentStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tamamlanmış randevu iptal edilemez");
        }
        appointmentRepository.delete(a);
        return a;
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponseDto> listByPatientTc(String tc) {
        List<Appointment> appts = appointmentRepository.findByPatient_TcKimlikOrderByStartAtDesc(tc.trim());
        if (appts.isEmpty()) {
            return List.of();
        }

        var visits = visitRecordRepository.findByAppointmentIn(appts);
        var payments = paymentRepository.findByVisitIn(visits);

        var apptToVisitMap = visits.stream().collect(java.util.stream.Collectors.toMap(
                v -> v.getAppointment().getId(),
                com.sifa.poliklinik.domain.VisitRecord::getId,
                (v1, v2) -> v1
        ));

        var paidVisitIds = payments.stream().map(p -> p.getVisit().getId()).collect(java.util.stream.Collectors.toSet());

        return appts.stream().map(a -> {
            Long visitId = apptToVisitMap.get(a.getId());
            boolean paid = visitId != null && paidVisitIds.contains(visitId);
            return DtoMapper.appointment(a, visitId, paid);
        }).toList();
    }
}
