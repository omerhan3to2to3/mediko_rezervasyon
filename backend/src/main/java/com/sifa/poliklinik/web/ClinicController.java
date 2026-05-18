package com.sifa.poliklinik.web;

import com.sifa.poliklinik.repository.ClinicRepository;
import com.sifa.poliklinik.web.dto.ClinicResponseDto;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clinics")
public class ClinicController {

    private final ClinicRepository clinicRepository;

    public ClinicController(ClinicRepository clinicRepository) {
        this.clinicRepository = clinicRepository;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<ClinicResponseDto> list() {
        return clinicRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(c -> new ClinicResponseDto(c.getId(), c.getName(), c.isActive()))
                .toList();
    }
}
