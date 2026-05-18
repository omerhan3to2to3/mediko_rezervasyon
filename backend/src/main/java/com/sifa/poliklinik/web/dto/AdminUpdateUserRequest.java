package com.sifa.poliklinik.web.dto;

import com.sifa.poliklinik.domain.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record AdminUpdateUserRequest(
        @NotBlank @Size(max = 80) String username,
        @Size(min = 8, max = 120) String password,
        @NotNull @Size(min = 1, max = 1) Set<Role> roles,
        Long clinicId,
        @Size(max = 160) String doctorFullName) {}
