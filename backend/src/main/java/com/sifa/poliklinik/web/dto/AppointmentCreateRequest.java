package com.sifa.poliklinik.web.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record AppointmentCreateRequest(
        @NotNull Long patientId, @NotNull Long doctorId, @NotNull Instant startAt) {}
