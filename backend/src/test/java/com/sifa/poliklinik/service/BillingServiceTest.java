package com.sifa.poliklinik.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.sifa.poliklinik.domain.BillingLine;
import com.sifa.poliklinik.domain.ServiceCatalog;
import com.sifa.poliklinik.domain.VisitRecord;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.BillingLineRepository;
import com.sifa.poliklinik.repository.PaymentRepository;
import com.sifa.poliklinik.repository.ServiceCatalogRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import java.math.BigDecimal;
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
 * BillingService birim testleri.
 * Fatura kalemleri ekleme, silme ve ödeme durumu kontrollerini doğrular.
 * 
 * @author Emre Erçin (Öğrenci No: 22011095) - UI/UX Sorumlusu & Frontend Geliştirici
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BillingServiceTest {

    @Mock private VisitRecordRepository visitRecordRepository;
    @Mock private ServiceCatalogRepository serviceCatalogRepository;
    @Mock private BillingLineRepository billingLineRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private AppointmentRepository appointmentRepository;

    @InjectMocks
    private BillingService billingService;

    @Test
    @DisplayName("Faturaya yeni hizmet kalemi başarıyla eklenir")
    void addLine_basarili() {
        VisitRecord mockVisit = mock(VisitRecord.class);
        when(mockVisit.getId()).thenReturn(1L);

        ServiceCatalog mockService = mock(ServiceCatalog.class);
        when(mockService.getId()).thenReturn(2L);
        when(mockService.getUnitPrice()).thenReturn(new BigDecimal("150.00"));

        when(visitRecordRepository.findFetchedById(1L)).thenReturn(Optional.of(mockVisit));
        when(paymentRepository.existsByVisitId(1L)).thenReturn(false);
        when(serviceCatalogRepository.findById(2L)).thenReturn(Optional.of(mockService));
        
        BillingLine mockLineSaved = mock(BillingLine.class);
        when(mockLineSaved.getQuantity()).thenReturn(3);
        when(mockLineSaved.getVisit()).thenReturn(mockVisit);
        when(mockLineSaved.getServiceCatalog()).thenReturn(mockService);
        when(mockLineSaved.getUnitPriceSnapshot()).thenReturn(new BigDecimal("150.00"));
        
        when(billingLineRepository.save(any(BillingLine.class))).thenReturn(mockLineSaved);

        BillingLine result = billingService.addLine(1L, 2L, 3);

        assertNotNull(result);
        assertEquals(3, result.getQuantity());
        assertEquals(mockVisit, result.getVisit());
        assertEquals(mockService, result.getServiceCatalog());
        assertEquals(new BigDecimal("150.00"), result.getUnitPriceSnapshot());
        verify(billingLineRepository).save(any(BillingLine.class));
    }

    @Test
    @DisplayName("Fatura kalemi adedi 1'den küçük olamaz, hata fırlatılır")
    void addLine_adetSifir_hataFirlatir() {
        assertThrows(ResponseStatusException.class, () -> billingService.addLine(1L, 2L, 0));
    }

    @Test
    @DisplayName("Ödemesi tamamlanmış bir ziyarete yeni kalem eklenemez, hata fırlatılır")
    void addLine_odemeYapilmis_hataFirlatir() {
        VisitRecord mockVisit = mock(VisitRecord.class);
        when(mockVisit.getId()).thenReturn(1L);

        when(visitRecordRepository.findFetchedById(1L)).thenReturn(Optional.of(mockVisit));
        when(paymentRepository.existsByVisitId(1L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
                () -> billingService.addLine(1L, 2L, 2));
        
        assertTrue(ex.getReason().contains("Ödeme tamamlanmış"));
    }

    @Test
    @DisplayName("Fatura kalemi başarıyla silinir")
    void deleteLine_basarili() {
        VisitRecord mockVisit = mock(VisitRecord.class);
        when(mockVisit.getId()).thenReturn(1L);

        BillingLine mockLine = mock(BillingLine.class);
        when(mockLine.getId()).thenReturn(10L);
        when(mockLine.getVisit()).thenReturn(mockVisit);

        when(billingLineRepository.findById(10L)).thenReturn(Optional.of(mockLine));
        when(paymentRepository.existsByVisitId(1L)).thenReturn(false);

        assertDoesNotThrow(() -> billingService.deleteLine(10L));
        verify(billingLineRepository).delete(mockLine);
    }

    @Test
    @DisplayName("Ödemesi tamamlanmış faturadan kalem silinemez, hata fırlatılır")
    void deleteLine_odemeYapilmis_hataFirlatir() {
        VisitRecord mockVisit = mock(VisitRecord.class);
        when(mockVisit.getId()).thenReturn(1L);

        BillingLine mockLine = mock(BillingLine.class);
        when(mockLine.getId()).thenReturn(10L);
        when(mockLine.getVisit()).thenReturn(mockVisit);

        when(billingLineRepository.findById(10L)).thenReturn(Optional.of(mockLine));
        when(paymentRepository.existsByVisitId(1L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, 
                () -> billingService.deleteLine(10L));

        assertTrue(ex.getReason().contains("Ödemesi tamamlanmış"));
        verify(billingLineRepository, never()).delete(any());
    }
}
