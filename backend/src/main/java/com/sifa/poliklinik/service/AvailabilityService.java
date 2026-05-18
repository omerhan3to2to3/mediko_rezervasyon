package com.sifa.poliklinik.service;

import com.sifa.poliklinik.config.ClinicScheduleProperties;
import com.sifa.poliklinik.domain.AppointmentStatus;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import com.sifa.poliklinik.web.dto.AvailabilityDoctorSlotsDto;
import com.sifa.poliklinik.web.dto.AvailabilitySlotDto;
import com.sifa.poliklinik.web.dto.AlternativeDateDto;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AvailabilityService {

    private static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");

    private final ClinicScheduleProperties schedule;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;

    public AvailabilityService(
            ClinicScheduleProperties schedule,
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository) {
        this.schedule = schedule;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    public List<AvailabilityDoctorSlotsDto> availabilityForClinic(Long clinicId, LocalDate date) {
        if (!isBusinessDay(date)) {
            return Collections.emptyList();
        }
        List<Doctor> doctors = doctorRepository.findByClinicIdAndActiveTrue(clinicId);
        List<AvailabilityDoctorSlotsDto> out = new ArrayList<>();
        for (Doctor d : doctors) {
            List<AvailabilitySlotDto> slots = new ArrayList<>();
            for (Instant start : generateSlots(date)) {
                Instant end = start.plus(schedule.getSlotMinutes(), ChronoUnit.MINUTES);
                if (!hasConflict(d.getId(), start, end)) {
                    slots.add(new AvailabilitySlotDto(start, end));
                }
            }
            slots.sort(Comparator.comparing(AvailabilitySlotDto::startAt));
            out.add(new AvailabilityDoctorSlotsDto(d.getId(), d.getFullName(), slots));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<AlternativeDateDto> alternativeDates(Long clinicId, LocalDate fromDate, int maxSuggestions) {
        int range = Math.max(1, schedule.getAlternativeDaysRange());
        List<AlternativeDateDto> suggestions = new ArrayList<>();
        for (int offset = 1; offset <= range && suggestions.size() < maxSuggestions; offset++) {
            LocalDate d = fromDate.plusDays(offset);
            if (!isBusinessDay(d)) {
                continue;
            }
            long freeSlots =
                    availabilityForClinic(clinicId, d).stream()
                            .mapToLong(x -> x.slots().size())
                            .sum();
            if (freeSlots > 0) {
                suggestions.add(new AlternativeDateDto(d, freeSlots));
            }
        }
        return suggestions;
    }

    private List<Instant> generateSlots(LocalDate date) {
        List<Instant> list = new ArrayList<>();
        addWindow(list, date, schedule.getDayStart(), schedule.getLunchStart());
        addWindow(list, date, schedule.getLunchEnd(), schedule.getDayEnd());
        return list;
    }

    private void addWindow(List<Instant> list, LocalDate date, java.time.LocalTime from, java.time.LocalTime to) {
        int step = schedule.getSlotMinutes();
        ZonedDateTime cursor = ZonedDateTime.of(date, from, ZONE);
        ZonedDateTime end = ZonedDateTime.of(date, to, ZONE);
        while (cursor.plusMinutes(step).compareTo(end) <= 0) {
            Instant start = cursor.toInstant();
            list.add(start);
            cursor = cursor.plusMinutes(step);
        }
    }

    private boolean hasConflict(Long doctorId, Instant start, Instant end) {
        return !appointmentRepository
                .findBlockingForDoctor(doctorId, AppointmentStatus.SCHEDULED, start, end)
                .isEmpty();
    }

    private static boolean isBusinessDay(LocalDate d) {
        DayOfWeek w = d.getDayOfWeek();
        return w != DayOfWeek.SATURDAY && w != DayOfWeek.SUNDAY;
    }
}
