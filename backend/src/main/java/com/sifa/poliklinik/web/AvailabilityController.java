package com.sifa.poliklinik.web;

import com.sifa.poliklinik.service.AvailabilityService;
import com.sifa.poliklinik.web.dto.AlternativeDateDto;
import com.sifa.poliklinik.web.dto.AvailabilityDoctorSlotsDto;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/availability")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping
    @PreAuthorize("hasRole('APPOINTMENT_CLERK')")
    public List<AvailabilityDoctorSlotsDto> availability(
            @RequestParam Long clinicId, @RequestParam LocalDate date) {
        return availabilityService.availabilityForClinic(clinicId, date);
    }

    @GetMapping("/alternatives")
    @PreAuthorize("hasRole('APPOINTMENT_CLERK')")
    public List<AlternativeDateDto> alternatives(
            @RequestParam Long clinicId, @RequestParam LocalDate fromDate, @RequestParam(defaultValue = "5") int limit) {
        return availabilityService.alternativeDates(clinicId, fromDate, Math.min(limit, 14));
    }
}
