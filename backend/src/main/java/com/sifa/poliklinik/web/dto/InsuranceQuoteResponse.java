package com.sifa.poliklinik.web.dto;

import java.math.BigDecimal;

public record InsuranceQuoteResponse(int coverageRatePercent, String message, BigDecimal estimatedDiscount, BigDecimal grossHint) {}
