package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.ClinicalDocument;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicalDocumentRepository extends JpaRepository<ClinicalDocument, Long> {

    List<ClinicalDocument> findByVisitIdOrderByCreatedAtAsc(Long visitId);
}
