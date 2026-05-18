package com.sifa.poliklinik.web;

import com.sifa.poliklinik.domain.AppUser;
import com.sifa.poliklinik.domain.Role;
import com.sifa.poliklinik.repository.AppUserRepository;
import com.sifa.poliklinik.security.JwtTokenProvider;
import com.sifa.poliklinik.web.dto.LoginRequest;
import com.sifa.poliklinik.web.dto.LoginResponse;
import jakarta.validation.Valid;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final AppUserRepository appUserRepository;

    public AuthController(
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider,
            AppUserRepository appUserRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.appUserRepository = appUserRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication =
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        UserDetails principal = (UserDetails) authentication.getPrincipal();
        AppUser user =
                appUserRepository
                        .findByUsername(principal.getUsername())
                        .orElseThrow(() -> new IllegalStateException("Kullanıcı bulunamadı"));
        String token = jwtTokenProvider.createToken(user);
        var roles = user.getRoles().stream().map(Role::name).collect(Collectors.toSet());
        return ResponseEntity.ok(new LoginResponse(token, user.getUsername(), roles));
    }
}
