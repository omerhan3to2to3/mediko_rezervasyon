package com.sifa.poliklinik.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record InsurancePreviewRequest(
        @NotBlank @Size(min = 11, max = 11) @Pattern(regexp = "\\d{11}") String tcKimlik,
        String grossHint) {}
