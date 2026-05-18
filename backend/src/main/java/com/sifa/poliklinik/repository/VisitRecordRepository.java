package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.VisitRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VisitRecordRepository extends JpaRepository<VisitRecord, Long> {

    @EntityGraph(attributePaths = {"appointment", "appointment.patient", "appointment.doctor", "doctor"})
    Optional<VisitRecord> findByAppointmentId(Long appointmentId);

    @EntityGraph(attributePaths = {"appointment", "appointment.patient", "appointment.doctor", "doctor"})
    @Query("SELECT v FROM VisitRecord v WHERE v.id = :id")
    Optional<VisitRecord> findFetchedById(@Param("id") Long id);
}
