package com.sifa.poliklinik.repository;

import com.sifa.poliklinik.domain.Doctor;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    @EntityGraph(attributePaths = "clinic")
    List<Doctor> findByClinicIdAndActiveTrue(Long clinicId);

    @EntityGraph(attributePaths = {"clinic", "appUser"})
    Optional<Doctor> findByAppUser_Id(Long appUserId);

    @EntityGraph(attributePaths = {"clinic", "appUser"})
    Optional<Doctor> findByIdAndActiveTrue(Long id);

    @EntityGraph(attributePaths = {"clinic", "appUser"})
    List<Doctor> findByActiveTrueOrderByFullNameAsc();
}
