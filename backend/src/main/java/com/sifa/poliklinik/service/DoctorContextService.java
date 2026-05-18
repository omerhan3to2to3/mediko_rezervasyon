package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.AppUser;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.repository.AppUserRepository;
import com.sifa.poliklinik.repository.DoctorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DoctorContextService {

    private final AppUserRepository appUserRepository;
    private final DoctorRepository doctorRepository;

    public DoctorContextService(AppUserRepository appUserRepository, DoctorRepository doctorRepository) {
        this.appUserRepository = appUserRepository;
        this.doctorRepository = doctorRepository;
    }

    public Doctor requireDoctor(Authentication authentication) {
        String username = authentication.getName();
        AppUser user =
                appUserRepository
                        .findByUsername(username)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        return doctorRepository
                .findByAppUser_Id(user.getId())
                .filter(Doctor::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }
}
