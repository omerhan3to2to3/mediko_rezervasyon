package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.domain.AppointmentStatus;
import com.sifa.poliklinik.domain.ClinicalDocument;
import com.sifa.poliklinik.domain.ClinicalDocumentType;
import com.sifa.poliklinik.domain.Doctor;
import com.sifa.poliklinik.domain.VisitRecord;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.ClinicalDocumentRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VisitService {

    private final VisitRecordRepository visitRecordRepository;
    private final AppointmentRepository appointmentRepository;
    private final ClinicalDocumentRepository clinicalDocumentRepository;
    private final DoctorContextService doctorContextService;

    public VisitService(
            VisitRecordRepository visitRecordRepository,
            AppointmentRepository appointmentRepository,
            ClinicalDocumentRepository clinicalDocumentRepository,
            DoctorContextService doctorContextService) {
        this.visitRecordRepository = visitRecordRepository;
        this.appointmentRepository = appointmentRepository;
        this.clinicalDocumentRepository = clinicalDocumentRepository;
        this.doctorContextService = doctorContextService;
    }

    @Transactional
    public VisitRecord upsertForAppointment(Long appointmentId, String diagnosis, String treatment, Authentication auth) {
        Doctor doctor = doctorContextService.requireDoctor(auth);
        Appointment appt =
                appointmentRepository.findById(appointmentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!appt.getDoctor().getId().equals(doctor.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu randevu sizin kliniğinize ait değil");
        }
        if (appt.getStatus() != AppointmentStatus.SCHEDULED && appt.getStatus() != AppointmentStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Randevu durumu muayeneye uygun değil");
        }
        VisitRecord visit =
                visitRecordRepository
                        .findByAppointmentId(appointmentId)
                        .orElseGet(
                                () -> {
                                    VisitRecord v = new VisitRecord();
                                    v.setAppointment(appt);
                                    v.setDoctor(doctor);
                                    return v;
                                });
        visit.setDiagnosisNotes(diagnosis);
        visit.setTreatmentNotes(treatment);
        visit.setDoctor(doctor);
        visit.setUpdatedAt(Instant.now());
        VisitRecord saved = visitRecordRepository.save(visit);
        appt.setStatus(AppointmentStatus.COMPLETED);
        appointmentRepository.save(appt);
        return saved;
    }

    @Transactional(readOnly = true)
    public VisitRecord get(Long visitId, Authentication auth) {
        Doctor doctor = doctorContextService.requireDoctor(auth);
        VisitRecord v =
                visitRecordRepository.findFetchedById(visitId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!v.getDoctor().getId().equals(doctor.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return v;
    }

    @Transactional(readOnly = true)
    public VisitRecord getByAppointment(Long appointmentId, Authentication auth) {
        Doctor doctor = doctorContextService.requireDoctor(auth);
        VisitRecord v =
                visitRecordRepository
                        .findByAppointmentId(appointmentId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!v.getAppointment().getDoctor().getId().equals(doctor.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return v;
    }

    @Transactional
    public ClinicalDocument addDocument(Long visitId, ClinicalDocumentType type, String content, Authentication auth) {
        Doctor doctor = doctorContextService.requireDoctor(auth);
        VisitRecord visit =
                visitRecordRepository.findFetchedById(visitId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!visit.getDoctor().getId().equals(doctor.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (type == ClinicalDocumentType.REFERRAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sevk kâğıdı şu an kullanıma kapalı");
        }
        ClinicalDocument doc = new ClinicalDocument();
        doc.setVisit(visit);
        doc.setDocType(type);
        doc.setContentText(content);
        return clinicalDocumentRepository.save(doc);
    }

    @Transactional(readOnly = true)
    public List<ClinicalDocument> listDocuments(Long visitId, Authentication auth) {
        get(visitId, auth);
        return clinicalDocumentRepository.findByVisitIdOrderByCreatedAtAsc(visitId);
    }
}
