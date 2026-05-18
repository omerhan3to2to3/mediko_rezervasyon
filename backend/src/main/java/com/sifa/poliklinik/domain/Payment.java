package com.sifa.poliklinik.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payment")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false, unique = true)
    private VisitRecord visit;

    @Column(name = "gross_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "net_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal netAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentMethod method;

    @Column(name = "insurance_tc_snapshot", length = 11)
    private String insuranceTcSnapshot;

    @Column(name = "coverage_rate_snapshot")
    private Integer coverageRateSnapshot;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt = Instant.now();

    public Long getId() {
        return id;
    }

    public VisitRecord getVisit() {
        return visit;
    }

    public void setVisit(VisitRecord visit) {
        this.visit = visit;
    }

    public BigDecimal getGrossAmount() {
        return grossAmount;
    }

    public void setGrossAmount(BigDecimal grossAmount) {
        this.grossAmount = grossAmount;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public BigDecimal getNetAmount() {
        return netAmount;
    }

    public void setNetAmount(BigDecimal netAmount) {
        this.netAmount = netAmount;
    }

    public PaymentMethod getMethod() {
        return method;
    }

    public void setMethod(PaymentMethod method) {
        this.method = method;
    }

    public String getInsuranceTcSnapshot() {
        return insuranceTcSnapshot;
    }

    public void setInsuranceTcSnapshot(String insuranceTcSnapshot) {
        this.insuranceTcSnapshot = insuranceTcSnapshot;
    }

    public Integer getCoverageRateSnapshot() {
        return coverageRateSnapshot;
    }

    public void setCoverageRateSnapshot(Integer coverageRateSnapshot) {
        this.coverageRateSnapshot = coverageRateSnapshot;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }
}
