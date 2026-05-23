package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.BillingLine;
import com.sifa.poliklinik.domain.Payment;
import com.sifa.poliklinik.domain.PaymentMethod;
import com.sifa.poliklinik.domain.VisitRecord;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.BillingLineRepository;
import com.sifa.poliklinik.repository.PaymentRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import com.sifa.poliklinik.service.InsuranceMockService.InsuranceQuote;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentService {

    private final VisitRecordRepository visitRecordRepository;
    private final BillingLineRepository billingLineRepository;
    private final PaymentRepository paymentRepository;
    private final InsuranceMockService insuranceMockService;
    private final AppointmentRepository appointmentRepository;

    public PaymentService(
            VisitRecordRepository visitRecordRepository,
            BillingLineRepository billingLineRepository,
            PaymentRepository paymentRepository,
            InsuranceMockService insuranceMockService,
            AppointmentRepository appointmentRepository) {
        this.visitRecordRepository = visitRecordRepository;
        this.billingLineRepository = billingLineRepository;
        this.paymentRepository = paymentRepository;
        this.insuranceMockService = insuranceMockService;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional
    public Payment collectForAppointment(Long appointmentId, String tcKimlikForInsuranceQuery, PaymentMethod method) {
        VisitRecord visit =
                visitRecordRepository
                        .findByAppointmentId(appointmentId)
                        .orElseGet(() -> {
                            var appt = appointmentRepository.findById(appointmentId)
                                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Randevu bulunamadı"));
                            VisitRecord v = new VisitRecord();
                            v.setAppointment(appt);
                            v.setDoctor(appt.getDoctor());
                            v.setDiagnosisNotes("");
                            v.setTreatmentNotes("");
                            return visitRecordRepository.save(v);
                        });
        return collect(visit.getId(), tcKimlikForInsuranceQuery, method);
    }

    @Transactional
    public Payment collect(Long visitId, String tcKimlikForInsuranceQuery, PaymentMethod method) {
        VisitRecord visit =
                visitRecordRepository.findFetchedById(visitId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (paymentRepository.existsByVisitId(visitId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu ziyaret için ödeme zaten alındı");
        }
        List<BillingLine> lines = billingLineRepository.findByVisitId(visitId);
        if (lines.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faturalandırılacak kalem yok");
        }
        BigDecimal gross =
                lines.stream()
                        .map(l -> l.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(l.getQuantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (gross.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçerli tutar yok");
        }
        String tc =
                tcKimlikForInsuranceQuery != null && !tcKimlikForInsuranceQuery.isBlank()
                        ? tcKimlikForInsuranceQuery.trim()
                        : visit.getAppointment().getPatient().getTcKimlik();
        InsuranceQuote quote = insuranceMockService.quote(tc);
        BigDecimal discount = insuranceMockService.discountAmount(gross, quote.coverageRatePercent());
        BigDecimal net = gross.subtract(discount);
        if (net.compareTo(BigDecimal.ZERO) < 0) {
            net = BigDecimal.ZERO;
        }
        Payment payment = new Payment();
        payment.setVisit(visit);
        payment.setGrossAmount(gross);
        payment.setDiscountAmount(discount);
        payment.setNetAmount(net);
        payment.setMethod(method);
        payment.setInsuranceTcSnapshot(tc);
        payment.setCoverageRateSnapshot(quote.coverageRatePercent());
        payment.setPaidAt(Instant.now());
        return paymentRepository.save(payment);
    }
}
