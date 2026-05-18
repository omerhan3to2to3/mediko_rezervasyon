package com.sifa.poliklinik.web.dto;

public record DoctorResponseDto(Long id, Long clinicId, String clinicName, String fullName, boolean active) {}
