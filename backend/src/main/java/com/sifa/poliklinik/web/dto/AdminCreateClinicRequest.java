package com.sifa.poliklinik.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminCreateClinicRequest(@NotBlank @Size(max = 120) String name) {}
