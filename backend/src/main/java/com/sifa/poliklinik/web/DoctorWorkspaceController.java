package com.sifa.poliklinik.web;

import com.sifa.poliklinik.service.DoctorAppointmentQueryService;
import com.sifa.poliklinik.service.DoctorContextService;
import com.sifa.poliklinik.service.VisitService;
import com.sifa.poliklinik.web.dto.AppointmentResponseDto;
import com.sifa.poliklinik.web.dto.ClinicalDocumentCreateRequest;
import com.sifa.poliklinik.web.dto.ClinicalDocumentResponseDto;
import com.sifa.poliklinik.web.dto.VisitResponseDto;
import com.sifa.poliklinik.web.dto.VisitUpsertRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/doctor")
public class DoctorWorkspaceController {

    private final DoctorContextService doctorContextService;
    private final DoctorAppointmentQueryService doctorAppointmentQueryService;
    private final VisitService visitService;

    public DoctorWorkspaceController(
            DoctorContextService doctorContextService,
            DoctorAppointmentQueryService doctorAppointmentQueryService,
            VisitService visitService) {
        this.doctorContextService = doctorContextService;
        this.doctorAppointmentQueryService = doctorAppointmentQueryService;
        this.visitService = visitService;
    }

    @GetMapping("/appointments")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<AppointmentResponseDto> day(@RequestParam LocalDate date, Authentication auth) {
        var doctor = doctorContextService.requireDoctor(auth);
        return doctorAppointmentQueryService.listDay(doctor.getId(), date).stream()
                .map(DtoMapper::appointment)
                .toList();
    }

    @PutMapping("/appointments/{appointmentId}/visit")
    @PreAuthorize("hasRole('DOCTOR')")
    public VisitResponseDto upsertVisit(
            @PathVariable Long appointmentId, @Valid @RequestBody VisitUpsertRequest req, Authentication auth) {
        var v =
                visitService.upsertForAppointment(
                        appointmentId, req.diagnosisNotes(), req.treatmentNotes(), auth);
        return DtoMapper.visit(v);
    }

    @GetMapping("/appointments/{appointmentId}/visit")
    @PreAuthorize("hasRole('DOCTOR')")
    public VisitResponseDto getVisit(@PathVariable Long appointmentId, Authentication auth) {
        return DtoMapper.visit(visitService.getByAppointment(appointmentId, auth));
    }

    @PostMapping("/visits/{visitId}/documents")
    @PreAuthorize("hasRole('DOCTOR')")
    public ClinicalDocumentResponseDto addDocument(
            @PathVariable Long visitId,
            @Valid @RequestBody ClinicalDocumentCreateRequest req,
            Authentication auth) {
        var doc = visitService.addDocument(visitId, req.docType(), req.contentText(), auth);
        return DtoMapper.document(doc);
    }

    @GetMapping("/visits/{visitId}/documents")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<ClinicalDocumentResponseDto> listDocs(@PathVariable Long visitId, Authentication auth) {
        return visitService.listDocuments(visitId, auth).stream().map(DtoMapper::document).toList();
    }
}
