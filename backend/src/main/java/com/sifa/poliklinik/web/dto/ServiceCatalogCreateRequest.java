package com.sifa.poliklinik.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ServiceCatalogCreateRequest(
        @NotBlank @Size(max = 40) String code,
        @NotBlank @Size(max = 255) String description,
        @NotNull @DecimalMin(value = "0.01", inclusive = true) BigDecimal unitPrice) {}
