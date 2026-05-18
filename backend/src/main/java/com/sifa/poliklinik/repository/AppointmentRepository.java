package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.domain.AppointmentStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    boolean existsByPatient_IdAndDoctor_Id(Long patientId, Long doctorId);

    @EntityGraph(attributePaths = {"patient", "doctor", "doctor.clinic"})
    @Query("SELECT a FROM Appointment a WHERE a.id = :id")
    Optional<Appointment> findDetailById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"patient", "doctor", "doctor.clinic"})
    @Query(
            """
            SELECT a FROM Appointment a
            WHERE a.doctor.id = :doctorId AND a.startAt >= :start AND a.startAt < :end
            ORDER BY a.startAt
            """)
    List<Appointment> findDoctorDay(@Param("doctorId") Long doctorId, @Param("start") Instant start, @Param("end") Instant end);

    @Query(
            """
            SELECT a FROM Appointment a
            WHERE a.doctor.id = :doctorId
              AND a.status = :status
              AND a.startAt < :rangeEnd
              AND a.endAt > :rangeStart
            """)
    List<Appointment> findBlockingForDoctor(
            @Param("doctorId") Long doctorId,
            @Param("status") AppointmentStatus status,
            @Param("rangeStart") Instant rangeStart,
            @Param("rangeEnd") Instant rangeEnd);

    List<Appointment> findByPatientIdOrderByStartAtDesc(Long patientId);

    List<Appointment> findByDoctorIdAndStartAtBetweenOrderByStartAtAsc(
            Long doctorId, Instant start, Instant end);

    @EntityGraph(attributePaths = {"patient", "doctor", "doctor.clinic"})
    List<Appointment> findByStartAtBetweenOrderByStartAtAsc(Instant start, Instant end);
}
