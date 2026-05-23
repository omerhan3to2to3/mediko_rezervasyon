package com.sifa.poliklinik.web.dto;

public record ClinicResponseDto(Long id, String name, boolean active, long doctorCount) {
    public ClinicResponseDto(Long id, String name, boolean active) {
        this(id, name, active, 0L);
    }
}
