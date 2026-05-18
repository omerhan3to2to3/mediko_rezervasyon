package com.sifa.poliklinik.web.dto;

import java.time.Instant;

public record AvailabilitySlotDto(Instant startAt, Instant endAt) {}
