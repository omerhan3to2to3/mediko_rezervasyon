package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.repository.AppointmentRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DoctorAppointmentQueryService {

    private static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");

    private final AppointmentRepository appointmentRepository;

    public DoctorAppointmentQueryService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    public List<Appointment> listDay(Long doctorId, LocalDate date) {
        ZonedDateTime start = date.atStartOfDay(ZONE);
        ZonedDateTime end = start.plusDays(1);
        return appointmentRepository.findDoctorDay(doctorId, start.toInstant(), end.toInstant());
    }
}
