package com.sifa.poliklinik.web;

import com.sifa.poliklinik.repository.DoctorRepository;
import com.sifa.poliklinik.web.dto.DoctorResponseDto;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/doctors")
public class DoctorPublicController {

    private final DoctorRepository doctorRepository;

    public DoctorPublicController(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<DoctorResponseDto> byClinic(@RequestParam Long clinicId) {
        return doctorRepository.findByClinicIdAndActiveTrue(clinicId).stream()
                .map(
                        d ->
                                new DoctorResponseDto(
                                        d.getId(),
                                        d.getClinic().getId(),
                                        d.getClinic().getName(),
                                        d.getFullName(),
                                        d.isActive()))
                .toList();
    }
}
