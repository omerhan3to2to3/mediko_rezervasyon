package com.sifa.poliklinik.web.dto;

import com.sifa.poliklinik.domain.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponseDto(
        Long id,
        Long visitId,
        BigDecimal grossAmount,
        BigDecimal discountAmount,
        BigDecimal netAmount,
        PaymentMethod method,
        Integer coverageRateSnapshot,
        Instant paidAt) {}
