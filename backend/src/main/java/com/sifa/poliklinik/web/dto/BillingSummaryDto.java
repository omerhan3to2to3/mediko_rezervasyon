package com.sifa.poliklinik.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record BillingSummaryDto(
        Long visitId,
        Long appointmentId,
        Long patientId,
        String patientTcKimlik,
        String patientFullName,
        BigDecimal grossTotal,
        List<BillingLineResponseDto> lines,
        boolean paid,
        BigDecimal discountAmount,
        BigDecimal netAmount,
        String paymentMethod,
        String diagnosisNotes,
        String treatmentNotes) {}
