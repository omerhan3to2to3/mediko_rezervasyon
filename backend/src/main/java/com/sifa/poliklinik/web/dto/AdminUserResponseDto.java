package com.sifa.poliklinik.web.dto;

import java.util.Set;

public record AdminUserResponseDto(
        Long id,
        String username,
        Set<String> roles,
        Long doctorId,
        Long clinicId,
        String clinicName,
        String doctorFullName) {}
