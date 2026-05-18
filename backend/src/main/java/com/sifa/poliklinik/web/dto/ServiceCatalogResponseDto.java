package com.sifa.poliklinik.web.dto;

import java.math.BigDecimal;

public record ServiceCatalogResponseDto(Long id, String code, String description, BigDecimal unitPrice) {}
