package com.sifa.poliklinik.service;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * InsuranceMockService birim testleri.
 * Sigorta kapsam oranı hesaplaması ve indirim tutarı mantığını doğrular.
 * 
 * @author İsa Koçan (Öğrenci No: 22011056) - Proje Yöneticisi & Backend Lideri
 */
class InsuranceMockServiceTest {

    private InsuranceMockService insuranceMockService;

    @BeforeEach
    void setUp() {
        insuranceMockService = new InsuranceMockService();
    }

    @Test
    @DisplayName("TC son hanesi 0 olan hasta için %50 kapsam oranı döner")
    void quote_sonHaneSifir_yuzdeElliKapsam() {
        // TC: 12345678900 → son hane 0, 0 % 4 = 0 → %50
        var quote = insuranceMockService.quote("12345678900");
        assertEquals(50, quote.coverageRatePercent());
        assertTrue(quote.message().contains("50"));
    }

    @Test
    @DisplayName("TC son hanesi 1 olan hasta için %25 kapsam oranı döner")
    void quote_sonHaneBir_yuzdeYirmibesKapsam() {
        // TC: 12345678901 → son hane 1, 1 % 4 = 1 → %25
        var quote = insuranceMockService.quote("12345678901");
        assertEquals(25, quote.coverageRatePercent());
        assertTrue(quote.message().contains("25"));
    }

    @Test
    @DisplayName("TC son hanesi 3 olan hasta sigorta kapsamında değildir")
    void quote_sonHaneUc_kapsamDisi() {
        // TC: 12345678903 → son hane 3, 3 % 4 = 3 → %0
        var quote = insuranceMockService.quote("12345678903");
        assertEquals(0, quote.coverageRatePercent());
        assertTrue(quote.message().contains("bulunamadı"));
    }

    @Test
    @DisplayName("Geçersiz TC numarası için %0 kapsam ve uyarı mesajı döner")
    void quote_gecersizTc_sifirKapsam() {
        var quote = insuranceMockService.quote("ABCDE");
        assertEquals(0, quote.coverageRatePercent());
        assertTrue(quote.message().contains("Geçersiz"));
    }

    @Test
    @DisplayName("Null TC numarası için %0 kapsam döner")
    void quote_nullTc_sifirKapsam() {
        var quote = insuranceMockService.quote(null);
        assertEquals(0, quote.coverageRatePercent());
    }

    @Test
    @DisplayName("Brüt tutar üzerinden %50 indirim doğru hesaplanır")
    void discountAmount_yuzdeElliIndirim() {
        BigDecimal gross = new BigDecimal("200.00");
        BigDecimal discount = insuranceMockService.discountAmount(gross, 50);
        assertEquals(new BigDecimal("100.00"), discount);
    }

    @Test
    @DisplayName("Kapsam oranı 0 olduğunda indirim sıfır döner")
    void discountAmount_sifirOran_sifirIndirim() {
        BigDecimal gross = new BigDecimal("500.00");
        BigDecimal discount = insuranceMockService.discountAmount(gross, 0);
        assertEquals(BigDecimal.ZERO, discount);
    }

    @Test
    @DisplayName("Kapsam oranı negatif olduğunda indirim sıfır döner")
    void discountAmount_negatifOran_sifirIndirim() {
        BigDecimal gross = new BigDecimal("100.00");
        BigDecimal discount = insuranceMockService.discountAmount(gross, -10);
        assertEquals(BigDecimal.ZERO, discount);
    }
}
