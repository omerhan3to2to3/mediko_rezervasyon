package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.Payment;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByVisitId(Long visitId);

    boolean existsByVisitId(Long visitId);
}
