package com.sifa.poliklinik.web.dto;

import com.sifa.poliklinik.domain.AppointmentStatus;
import java.time.Instant;

public record AppointmentResponseDto(
        Long id,
        Long patientId,
        String patientName,
        Long doctorId,
        String doctorName,
        Long clinicId,
        String clinicName,
        Instant startAt,
        Instant endAt,
        AppointmentStatus status) {}
