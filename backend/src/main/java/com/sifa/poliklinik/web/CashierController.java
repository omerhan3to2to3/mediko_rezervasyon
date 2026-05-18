package com.sifa.poliklinik.web;

import com.sifa.poliklinik.domain.PaymentMethod;
import com.sifa.poliklinik.service.BillingService;
import com.sifa.poliklinik.service.InsuranceMockService;
import com.sifa.poliklinik.service.PaymentService;
import com.sifa.poliklinik.web.dto.BillingLineAddRequest;
import com.sifa.poliklinik.web.dto.BillingSummaryDto;
import com.sifa.poliklinik.web.dto.InsurancePreviewRequest;
import com.sifa.poliklinik.web.dto.InsuranceQuoteResponse;
import com.sifa.poliklinik.web.dto.PaymentCollectRequest;
import com.sifa.poliklinik.web.dto.PaymentResponseDto;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cashier")
public class CashierController {

    private final BillingService billingService;
    private final PaymentService paymentService;
    private final InsuranceMockService insuranceMockService;

    public CashierController(
            BillingService billingService, PaymentService paymentService, InsuranceMockService insuranceMockService) {
        this.billingService = billingService;
        this.paymentService = paymentService;
        this.insuranceMockService = insuranceMockService;
    }

    @PostMapping("/appointments/{appointmentId}/billing-lines")
    @PreAuthorize("hasRole('CASHIER')")
    public ResponseEntity<Void> addLine(
            @PathVariable Long appointmentId, @Valid @RequestBody BillingLineAddRequest req) {
        billingService.addLineForAppointment(appointmentId, req.serviceCatalogId(), req.quantity());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/appointments/{appointmentId}/billing-summary")
    @PreAuthorize("hasRole('CASHIER')")
    public BillingSummaryDto summary(@PathVariable Long appointmentId) {
        return billingService.summarizeByAppointmentId(appointmentId);
    }

    @PostMapping("/appointments/{appointmentId}/payments")
    @PreAuthorize("hasRole('CASHIER')")
    public PaymentResponseDto pay(@PathVariable Long appointmentId, @Valid @RequestBody PaymentCollectRequest req) {
        PaymentMethod method = req.method();
        var payment = paymentService.collectForAppointment(appointmentId, req.tcKimlikForInsuranceQuery(), method);
        return DtoMapper.payment(payment);
    }

    @PostMapping("/insurance-preview")
    @PreAuthorize("hasRole('CASHIER')")
    public InsuranceQuoteResponse preview(@Valid @RequestBody InsurancePreviewRequest req) {
        var quote = insuranceMockService.quote(req.tcKimlik());
        BigDecimal gross =
                req.grossHint() != null && !req.grossHint().isBlank()
                        ? new BigDecimal(req.grossHint().trim())
                        : BigDecimal.ZERO;
        BigDecimal discount = insuranceMockService.discountAmount(gross, quote.coverageRatePercent());
        return new InsuranceQuoteResponse(quote.coverageRatePercent(), quote.message(), discount, gross);
    }
}
