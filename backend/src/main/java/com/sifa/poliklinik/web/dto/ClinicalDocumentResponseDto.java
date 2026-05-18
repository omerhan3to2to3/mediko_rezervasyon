package com.sifa.poliklinik.web.dto;

import com.sifa.poliklinik.domain.ClinicalDocumentType;
import java.time.Instant;

public record ClinicalDocumentResponseDto(Long id, ClinicalDocumentType docType, String contentText, Instant createdAt) {}
