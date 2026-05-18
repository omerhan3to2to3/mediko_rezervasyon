package com.sifa.poliklinik.web.dto;

import com.sifa.poliklinik.domain.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record PaymentCollectRequest(@NotNull PaymentMethod method, String tcKimlikForInsuranceQuery) {}
