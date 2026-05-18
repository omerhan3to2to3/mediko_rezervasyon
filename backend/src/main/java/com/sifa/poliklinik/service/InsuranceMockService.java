package com.sifa.poliklinik.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;

@Service
public class InsuranceMockService {

    /**
     * Deterministic mock: TC son haneye göre kapsama oranı (SGK yerine stub).
     */
    public InsuranceQuote quote(String tcKimlik) {
        if (tcKimlik == null || tcKimlik.length() != 11 || !tcKimlik.chars().allMatch(Character::isDigit)) {
            return new InsuranceQuote(0, "Geçersiz TC — sigorta indirimi uygulanmadı");
        }
        int last = Character.getNumericValue(tcKimlik.charAt(10));
        int rate = switch (last % 4) {
            case 0 -> 50;
            case 1 -> 25;
            case 2 -> 75;
            default -> 0;
        };
        String msg =
                rate == 0
                        ? "Sigorta kapsamı bulunamadı (mock)"
                        : "Sosyal sigorta mock — %" + rate + " hasta payı";
        return new InsuranceQuote(rate, msg);
    }

    public BigDecimal discountAmount(BigDecimal gross, int coverageRatePercent) {
        if (coverageRatePercent <= 0 || coverageRatePercent > 100) {
            return BigDecimal.ZERO;
        }
        return gross
                .multiply(BigDecimal.valueOf(coverageRatePercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public record InsuranceQuote(int coverageRatePercent, String message) {}
}
