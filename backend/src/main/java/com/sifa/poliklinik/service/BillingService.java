package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.BillingLine;
import com.sifa.poliklinik.domain.ServiceCatalog;
import com.sifa.poliklinik.domain.VisitRecord;
import com.sifa.poliklinik.repository.BillingLineRepository;
import com.sifa.poliklinik.repository.PaymentRepository;
import com.sifa.poliklinik.repository.ServiceCatalogRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import com.sifa.poliklinik.web.dto.BillingLineResponseDto;
import com.sifa.poliklinik.web.dto.BillingSummaryDto;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingService {

    private final VisitRecordRepository visitRecordRepository;
    private final ServiceCatalogRepository serviceCatalogRepository;
    private final BillingLineRepository billingLineRepository;
    private final PaymentRepository paymentRepository;

    public BillingService(
            VisitRecordRepository visitRecordRepository,
            ServiceCatalogRepository serviceCatalogRepository,
            BillingLineRepository billingLineRepository,
            PaymentRepository paymentRepository) {
        this.visitRecordRepository = visitRecordRepository;
        this.serviceCatalogRepository = serviceCatalogRepository;
        this.billingLineRepository = billingLineRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public BillingLine addLineForAppointment(Long appointmentId, Long serviceCatalogId, int quantity) {
        VisitRecord visit =
                visitRecordRepository
                        .findByAppointmentId(appointmentId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Önce muayene kaydı oluşturulmalı"));
        return addLine(visit.getId(), serviceCatalogId, quantity);
    }

    @Transactional
    public BillingLine addLine(Long visitId, Long serviceCatalogId, int quantity) {
        if (quantity < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adet en az 1 olmalı");
        }
        VisitRecord visit =
                visitRecordRepository.findFetchedById(visitId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (paymentRepository.existsByVisitId(visitId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ödeme tamamlanmış ziyarete kalem eklenemez");
        }
        ServiceCatalog cat =
                serviceCatalogRepository
                        .findById(serviceCatalogId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        BillingLine line = new BillingLine();
        line.setVisit(visit);
        line.setServiceCatalog(cat);
        line.setQuantity(quantity);
        line.setUnitPriceSnapshot(cat.getUnitPrice());
        return billingLineRepository.save(line);
    }

    @Transactional(readOnly = true)
    public BillingSummaryDto summarizeByAppointmentId(Long appointmentId) {
        VisitRecord visit =
                visitRecordRepository
                        .findByAppointmentId(appointmentId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return summarize(visit.getId());
    }

    @Transactional(readOnly = true)
    public BillingSummaryDto summarize(Long visitId) {
        VisitRecord visit =
                visitRecordRepository.findFetchedById(visitId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<BillingLine> lines = billingLineRepository.findByVisitId(visitId);
        BigDecimal gross =
                lines.stream()
                        .map(l -> l.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(l.getQuantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<BillingLineResponseDto> dtos =
                lines.stream()
                        .map(
                                l ->
                                        new BillingLineResponseDto(
                                                l.getId(),
                                                l.getServiceCatalog().getCode(),
                                                l.getServiceCatalog().getDescription(),
                                                l.getQuantity(),
                                                l.getUnitPriceSnapshot(),
                                                l.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(l.getQuantity()))))
                        .toList();
        boolean paid = paymentRepository.existsByVisitId(visitId);
        var patient = visit.getAppointment().getPatient();
        return new BillingSummaryDto(
                visitId,
                visit.getAppointment().getId(),
                patient.getId(),
                patient.getTcKimlik(),
                patient.getFirstName() + " " + patient.getLastName(),
                gross,
                dtos,
                paid);
    }
}
