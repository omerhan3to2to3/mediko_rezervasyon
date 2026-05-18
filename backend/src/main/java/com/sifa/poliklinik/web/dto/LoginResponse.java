package com.sifa.poliklinik.web.dto;

import java.util.Set;

public record LoginResponse(String token, String username, Set<String> roles) {}
