package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.Clinic;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicRepository extends JpaRepository<Clinic, Long> {

    List<Clinic> findByActiveTrueOrderByNameAsc();
}
