package com.sifa.poliklinik.security;

import com.sifa.poliklinik.config.JwtProperties;
import com.sifa.poliklinik.domain.AppUser;
import com.sifa.poliklinik.domain.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.stream.Collectors;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;

    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    private SecretKey key() {
        byte[] bytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(bytes);
    }

    public String createToken(AppUser user) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + jwtProperties.getExpirationMs());
        String roles =
                user.getRoles().stream().map(Role::name).collect(Collectors.joining(","));
        return Jwts.builder()
                .subject(user.getUsername())
                .issuedAt(now)
                .expiration(exp)
                .claim("uid", user.getId())
                .claim("roles", roles)
                .signWith(key())
                .compact();
    }

    public String getUsername(String token) {
        return parse(token).getSubject();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload();
    }
}
