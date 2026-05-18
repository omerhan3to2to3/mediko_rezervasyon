package com.sifa.poliklinik.web.dto;

public record PatientResponseDto(
        Long id, String tcKimlik, String firstName, String lastName, String phone, String email) {}
