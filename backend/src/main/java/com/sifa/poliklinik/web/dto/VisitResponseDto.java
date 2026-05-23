package com.sifa.poliklinik.web.dto;

import java.time.Instant;

public record VisitResponseDto(
        Long id,
        Long appointmentId,
        Long doctorId,
        String doctorName,
        String clinicName,
        Instant visitDate,
        String diagnosisNotes,
        String treatmentNotes
) {}

