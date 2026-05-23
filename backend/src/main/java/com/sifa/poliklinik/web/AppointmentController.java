package com.sifa.poliklinik.web;

import com.sifa.poliklinik.service.AppointmentService;
import com.sifa.poliklinik.web.dto.AppointmentCreateRequest;
import com.sifa.poliklinik.web.dto.AppointmentResponseDto;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    @PreAuthorize("hasRole('APPOINTMENT_CLERK')")
    public AppointmentResponseDto create(@Valid @RequestBody AppointmentCreateRequest req) {
        var a = appointmentService.create(req.patientId(), req.doctorId(), req.startAt());
        return DtoMapper.appointment(a);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('APPOINTMENT_CLERK','REGISTRATION_CLERK','DOCTOR','CASHIER')")
    public AppointmentResponseDto get(@PathVariable Long id, Authentication auth) {
        return DtoMapper.appointment(appointmentService.get(id, auth));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('APPOINTMENT_CLERK','CASHIER','ADMIN')")
    public List<AppointmentResponseDto> list(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String tc) {
        return appointmentService.listAppointments(date, tc);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('APPOINTMENT_CLERK')")
    public AppointmentResponseDto cancel(@PathVariable Long id) {
        var a = appointmentService.cancel(id);
        return DtoMapper.appointment(a);
    }

    @GetMapping("/by-tc/{tc}")
    @PreAuthorize("hasAnyRole('APPOINTMENT_CLERK','CASHIER','ADMIN')")
    public List<AppointmentResponseDto> listByTc(@PathVariable String tc) {
        return appointmentService.listByPatientTc(tc);
    }
}

