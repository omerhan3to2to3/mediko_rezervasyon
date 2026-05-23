package com.sifa.poliklinik.web;

import com.sifa.poliklinik.service.PatientService;
import com.sifa.poliklinik.web.dto.PatientCreateRequest;
import com.sifa.poliklinik.web.dto.PatientResponseDto;
import com.sifa.poliklinik.web.dto.PatientUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
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

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    @PreAuthorize("hasRole('REGISTRATION_CLERK')")
    public PatientResponseDto create(@Valid @RequestBody PatientCreateRequest req, Authentication auth) {
        var p =
                patientService.create(
                        req.tcKimlik(), req.firstName(), req.lastName(), req.phone(), req.email(), auth);
        return DtoMapper.patient(p);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('REGISTRATION_CLERK','DOCTOR')")
    public PatientResponseDto update(@PathVariable Long id, @Valid @RequestBody PatientUpdateRequest req, Authentication auth) {
        var p = patientService.update(id, req.firstName(), req.lastName(), req.phone(), req.email(), auth);
        return DtoMapper.patient(p);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('REGISTRATION_CLERK','APPOINTMENT_CLERK','DOCTOR','CASHIER')")
    public PatientResponseDto getOne(@PathVariable Long id, Authentication auth) {
        return DtoMapper.patient(patientService.get(id, auth));
    }

    @GetMapping("/by-tc/{tc}")
    @PreAuthorize("hasAnyRole('REGISTRATION_CLERK','APPOINTMENT_CLERK','DOCTOR','CASHIER')")
    public PatientResponseDto getByTc(@PathVariable String tc, Authentication auth) {
        return DtoMapper.patient(patientService.getByTc(tc, auth));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('REGISTRATION_CLERK','APPOINTMENT_CLERK','DOCTOR','CASHIER','ADMIN')")
    public List<PatientResponseDto> search(@RequestParam String q, Authentication auth) {
        return patientService.search(q, auth).stream().map(DtoMapper::patient).toList();
    }
}
