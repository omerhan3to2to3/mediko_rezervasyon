package com.sifa.poliklinik.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PatientCreateRequest(
        @NotBlank @Size(min = 11, max = 11) @Pattern(regexp = "\\d{11}") String tcKimlik,
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 80) String lastName,
        @Pattern(
                        regexp = "^(05\\d{9})?$",
                        message = "Telefon numarası 05xxxxxxxxx formatında olmalıdır")
                String phone,
        @Size(max = 120) String email) {}
