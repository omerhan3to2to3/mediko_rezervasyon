package com.sifa.poliklinik.web.dto;

import java.time.LocalDate;

public record AlternativeDateDto(LocalDate date, long suggestedSlotCount) {}
