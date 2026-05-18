package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.BillingLine;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingLineRepository extends JpaRepository<BillingLine, Long> {

    List<BillingLine> findByVisitId(Long visitId);
}
