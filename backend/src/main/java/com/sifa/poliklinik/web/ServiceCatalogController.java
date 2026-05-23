package com.sifa.poliklinik.web;

import com.sifa.poliklinik.repository.ServiceCatalogRepository;
import com.sifa.poliklinik.web.dto.ServiceCatalogCreateRequest;
import com.sifa.poliklinik.web.dto.ServiceCatalogResponseDto;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/service-catalog")
public class ServiceCatalogController {

    private final ServiceCatalogRepository serviceCatalogRepository;

    public ServiceCatalogController(ServiceCatalogRepository serviceCatalogRepository) {
        this.serviceCatalogRepository = serviceCatalogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'DOCTOR')")
    public List<ServiceCatalogResponseDto> list() {
        return serviceCatalogRepository.findAll().stream().map(DtoMapper::catalog).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('CASHIER')")
    public ServiceCatalogResponseDto create(@Valid @RequestBody ServiceCatalogCreateRequest request) {
        var item = new com.sifa.poliklinik.domain.ServiceCatalog();
        item.setCode(request.code().trim().toUpperCase());
        item.setDescription(request.description().trim());
        item.setUnitPrice(request.unitPrice());
        try {
            var saved = serviceCatalogRepository.save(item);
            return DtoMapper.catalog(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu kodda bir tedavi türü zaten var");
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CASHIER')")
    public ServiceCatalogResponseDto update(@PathVariable Long id, @Valid @RequestBody ServiceCatalogCreateRequest request) {
        var item = serviceCatalogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        item.setDescription(request.description().trim());
        item.setUnitPrice(request.unitPrice());
        try {
            var saved = serviceCatalogRepository.save(item);
            return DtoMapper.catalog(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Hata oluştu");
        }
    }
}
