package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.Patient;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByTcKimlik(String tcKimlik);

    boolean existsByTcKimlik(String tcKimlik);

    @Query(
            """
            SELECT p FROM Patient p
            WHERE LOWER(p.tcKimlik) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(p.firstName) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(p.lastName) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY p.lastName, p.firstName
            """)
    List<Patient> search(@Param("q") String q);

    @Query(
            """
            SELECT DISTINCT p FROM Patient p
            JOIN Appointment a ON a.patient.id = p.id
            WHERE a.doctor.id = :doctorId
              AND (
                    LOWER(p.tcKimlik) LIKE LOWER(CONCAT('%', :q, '%'))
                 OR LOWER(p.firstName) LIKE LOWER(CONCAT('%', :q, '%'))
                 OR LOWER(p.lastName) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY p.lastName, p.firstName
            """)
    List<Patient> searchForDoctor(@Param("doctorId") Long doctorId, @Param("q") String q);
}
