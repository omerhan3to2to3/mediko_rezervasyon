package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.ServiceCatalog;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceCatalogRepository extends JpaRepository<ServiceCatalog, Long> {

    Optional<ServiceCatalog> findByCode(String code);
}
