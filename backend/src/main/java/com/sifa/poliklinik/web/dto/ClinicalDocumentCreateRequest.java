package com.sifa.poliklinik.web.dto;

import com.sifa.poliklinik.domain.ClinicalDocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClinicalDocumentCreateRequest(@NotNull ClinicalDocumentType docType, @NotBlank String contentText) {}
