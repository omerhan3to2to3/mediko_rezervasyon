package com.sifa.poliklinik.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.domain.BillingLine;
import com.sifa.poliklinik.domain.Patient;
import com.sifa.poliklinik.domain.Payment;
import com.sifa.poliklinik.domain.PaymentMethod;
import com.sifa.poliklinik.domain.VisitRecord;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.BillingLineRepository;
import com.sifa.poliklinik.repository.PaymentRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import com.sifa.poliklinik.service.InsuranceMockService.InsuranceQuote;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.server.ResponseStatusException;

/**
 * PaymentService birim testleri.
 * Muayene faturası ödeme tahsilatı, brüt/net hesaplamaları ve mükerrer ödeme denetimlerini doğrular.
 * 
 * @author İsa Koçan (Öğrenci No: 22011056) - Proje Yöneticisi & Backend Lideri
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PaymentServiceTest {

    @Mock private VisitRecordRepository visitRecordRepository;
    @Mock private BillingLineRepository billingLineRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private InsuranceMockService insuranceMockService;
    @Mock private AppointmentRepository appointmentRepository;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    @DisplayName("Ziyaret ödemesi sigorta indirimi uygulanarak başarıyla tahsil edilir")
    void collect_basarili() {
        Patient mockPatient = mock(Patient.class);
        when(mockPatient.getTcKimlik()).thenReturn("12345678901");

        Appointment mockAppt = mock(Appointment.class);
        when(mockAppt.getPatient()).thenReturn(mockPatient);

        VisitRecord mockVisit = mock(VisitRecord.class);
        when(mockVisit.getId()).thenReturn(1L);
        when(mockVisit.getAppointment()).thenReturn(mockAppt);

        BillingLine line1 = mock(BillingLine.class);
        when(line1.getUnitPriceSnapshot()).thenReturn(new BigDecimal("100.00"));
        when(line1.getQuantity()).thenReturn(2);

        when(visitRecordRepository.findFetchedById(1L)).thenReturn(Optional.of(mockVisit));
        when(paymentRepository.existsByVisitId(1L)).thenReturn(false);
        when(billingLineRepository.findByVisitId(1L)).thenReturn(List.of(line1));

        // Sigorta indirimi mocklama: %50 indirim
        InsuranceQuote mockQuote = new InsuranceQuote(50, "Sosyal sigorta mock — %50 hasta payı");
        when(insuranceMockService.quote("12345678901")).thenReturn(mockQuote);
        when(insuranceMockService.discountAmount(new BigDecimal("200.00"), 50)).thenReturn(new BigDecimal("100.00"));

        Payment mockSavedPayment = mock(Payment.class);
        when(mockSavedPayment.getId()).thenReturn(500L);
        when(mockSavedPayment.getVisit()).thenReturn(mockVisit);
        when(mockSavedPayment.getGrossAmount()).thenReturn(new BigDecimal("200.00"));
        when(mockSavedPayment.getDiscountAmount()).thenReturn(new BigDecimal("100.00"));
        when(mockSavedPayment.getNetAmount()).thenReturn(new BigDecimal("100.00"));
        when(mockSavedPayment.getMethod()).thenReturn(PaymentMethod.CARD);
        when(mockSavedPayment.getInsuranceTcSnapshot()).thenReturn("12345678901");
        when(mockSavedPayment.getCoverageRateSnapshot()).thenReturn(50);

        when(paymentRepository.save(any(Payment.class))).thenReturn(mockSavedPayment);

        Payment result = paymentService.collect(1L, "12345678901", PaymentMethod.CARD);

        assertNotNull(result);
        assertEquals(500L, result.getId());
        assertEquals(new BigDecimal("200.00"), result.getGrossAmount());
        assertEquals(new BigDecimal("100.00"), result.getDiscountAmount());
        assertEquals(new BigDecimal("100.00"), result.getNetAmount());
        assertEquals(50, result.getCoverageRateSnapshot());
        assertEquals(PaymentMethod.CARD, result.getMethod());
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    @DisplayName("Ödemesi önceden alınmış muayeneye mükerrer ödeme yapılamaz, 409 hata fırlatılır")
    void collect_odemeZatenAlinmis_hataFirlatir() {
        VisitRecord mockVisit = mock(VisitRecord.class);
        when(visitRecordRepository.findFetchedById(1L)).thenReturn(Optional.of(mockVisit));
        when(paymentRepository.existsByVisitId(1L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> paymentService.collect(1L, "12345678901", PaymentMethod.CASH));
        
        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("ödeme zaten alındı"));
    }

    @Test
    @DisplayName("Faturada hiçbir hizmet kalemi bulunmuyorsa ödeme alınamaz, 400 hata fırlatılır")
    void collect_hizmetKalemiYok_hataFirlatir() {
        VisitRecord mockVisit = mock(VisitRecord.class);
        when(visitRecordRepository.findFetchedById(1L)).thenReturn(Optional.of(mockVisit));
        when(paymentRepository.existsByVisitId(1L)).thenReturn(false);
        
        // Fatura kalemleri boş
        when(billingLineRepository.findByVisitId(1L)).thenReturn(Collections.emptyList());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> paymentService.collect(1L, "12345678901", PaymentMethod.CASH));
        
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Faturalandırılacak kalem yok"));
    }
}
