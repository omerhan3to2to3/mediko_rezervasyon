package com.sifa.poliklinik.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record BillingLineAddRequest(@NotNull Long serviceCatalogId, @Min(1) int quantity) {}
