package com.sifa.poliklinik.web.dto;

import java.math.BigDecimal;

public record BillingLineResponseDto(
        Long id, String serviceCode, String description, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}
