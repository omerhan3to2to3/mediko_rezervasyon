package com.sifa.poliklinik.web.dto;

import java.util.List;

public record AvailabilityDoctorSlotsDto(Long doctorId, String doctorName, List<AvailabilitySlotDto> slots) {}
