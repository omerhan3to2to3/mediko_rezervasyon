package com.sifa.poliklinik.web.dto;

public record VisitResponseDto(Long id, Long appointmentId, Long doctorId, String diagnosisNotes, String treatmentNotes) {}
