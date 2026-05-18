package com.sifa.poliklinik.web;

import com.sifa.poliklinik.service.AdminUserService;
import com.sifa.poliklinik.service.AdminReportService;
import com.sifa.poliklinik.repository.ClinicRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import com.sifa.poliklinik.web.dto.AdminCreateClinicRequest;
import com.sifa.poliklinik.web.dto.AdminCreateUserRequest;
import com.sifa.poliklinik.web.dto.AdminUpdateUserRequest;
import com.sifa.poliklinik.web.dto.AdminUserResponseDto;
import com.sifa.poliklinik.web.dto.ClinicResponseDto;
import com.sifa.poliklinik.web.dto.DoctorResponseDto;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminUserService adminUserService;
    private final AdminReportService adminReportService;
    private final ClinicRepository clinicRepository;
    private final DoctorRepository doctorRepository;

    public AdminController(
            AdminUserService adminUserService,
            AdminReportService adminReportService,
            ClinicRepository clinicRepository,
            DoctorRepository doctorRepository) {
        this.adminUserService = adminUserService;
        this.adminReportService = adminReportService;
        this.clinicRepository = clinicRepository;
        this.doctorRepository = doctorRepository;
    }

    @PostMapping("/users")
    public AdminUserResponseDto createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return adminUserService.create(request);
    }

    @PatchMapping("/users/{id}")
    public AdminUserResponseDto updateUser(
            @PathVariable Long id, @Valid @RequestBody AdminUpdateUserRequest request, Authentication authentication) {
        return adminUserService.update(id, request, authentication.getName());
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id, Authentication authentication) {
        adminUserService.delete(id, authentication.getName());
    }

    @GetMapping("/users")
    public List<AdminUserResponseDto> listUsers() {
        return adminUserService.list();
    }

    @PostMapping("/clinics")
    public ClinicResponseDto createClinic(@Valid @RequestBody AdminCreateClinicRequest request) {
        var c = adminUserService.createClinic(request);
        return new ClinicResponseDto(c.getId(), c.getName(), c.isActive());
    }

    @GetMapping("/clinics")
    public List<ClinicResponseDto> clinics() {
        return clinicRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(c -> new ClinicResponseDto(c.getId(), c.getName(), c.isActive()))
                .toList();
    }

    @GetMapping("/doctors")
    public List<DoctorResponseDto> doctorsByClinic(@RequestParam Long clinicId) {
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

    @GetMapping("/reports/appointments")
    public ResponseEntity<byte[]> appointmentReport(
            @RequestParam String period,
            @RequestParam java.time.LocalDate date) {
        AdminReportService.Period parsed;
        try {
            parsed = AdminReportService.Period.valueOf(period.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Period daily, weekly veya monthly olmalidir");
        }
        byte[] data = adminReportService.appointmentReportPdf(parsed, date);
        String filename = "randevu-raporu-" + parsed.name().toLowerCase() + "-" + date + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(data);
    }
}
