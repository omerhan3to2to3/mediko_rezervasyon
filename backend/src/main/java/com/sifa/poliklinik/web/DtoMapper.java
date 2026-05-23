package com.sifa.poliklinik.web;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.domain.ClinicalDocument;
import com.sifa.poliklinik.domain.Patient;
import com.sifa.poliklinik.domain.Payment;
import com.sifa.poliklinik.domain.ServiceCatalog;
import com.sifa.poliklinik.domain.VisitRecord;
import com.sifa.poliklinik.web.dto.AppointmentResponseDto;
import com.sifa.poliklinik.web.dto.ClinicalDocumentResponseDto;
import com.sifa.poliklinik.web.dto.PatientResponseDto;
import com.sifa.poliklinik.web.dto.PaymentResponseDto;
import com.sifa.poliklinik.web.dto.ServiceCatalogResponseDto;
import com.sifa.poliklinik.web.dto.VisitResponseDto;

public final class DtoMapper {

    private DtoMapper() {}

    public static PatientResponseDto patient(Patient p) {
        return new PatientResponseDto(
                p.getId(), p.getTcKimlik(), p.getFirstName(), p.getLastName(), p.getPhone(), p.getEmail());
    }

    public static AppointmentResponseDto appointment(Appointment a) {
        return appointment(a, null, false);
    }

    public static AppointmentResponseDto appointment(Appointment a, Long visitId, boolean paid) {
        var pt = a.getPatient();
        var dr = a.getDoctor();
        var cl = dr.getClinic();
        String patientName = pt.getFirstName() + " " + pt.getLastName();
        return new AppointmentResponseDto(
                a.getId(),
                pt.getId(),
                patientName,
                pt.getTcKimlik(),
                dr.getId(),
                dr.getFullName(),
                cl.getId(),
                cl.getName(),
                a.getStartAt(),
                a.getEndAt(),
                a.getStatus(),
                visitId,
                paid);
    }

    public static VisitResponseDto visit(VisitRecord v) {
        var appt = v.getAppointment();
        var doctor = v.getDoctor();
        var clinic = doctor.getClinic();
        return new VisitResponseDto(
                v.getId(),
                appt.getId(),
                doctor.getId(),
                doctor.getFullName(),
                clinic.getName(),
                appt.getStartAt(),
                v.getDiagnosisNotes(),
                v.getTreatmentNotes());
    }


    public static ClinicalDocumentResponseDto document(ClinicalDocument d) {
        return new ClinicalDocumentResponseDto(d.getId(), d.getDocType(), d.getContentText(), d.getCreatedAt());
    }

    public static PaymentResponseDto payment(Payment p) {
        return new PaymentResponseDto(
                p.getId(),
                p.getVisit().getId(),
                p.getGrossAmount(),
                p.getDiscountAmount(),
                p.getNetAmount(),
                p.getMethod(),
                p.getCoverageRateSnapshot(),
                p.getPaidAt());
    }

    public static ServiceCatalogResponseDto catalog(ServiceCatalog s) {
        return new ServiceCatalogResponseDto(s.getId(), s.getCode(), s.getDescription(), s.getUnitPrice());
    }
}
