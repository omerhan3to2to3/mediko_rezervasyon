package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.ClinicalDocumentRepository;
import com.sifa.poliklinik.repository.PaymentRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminReportService {
    public enum Period { DAILY, WEEKLY, MONTHLY }

    private static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");
    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
    private final AppointmentRepository appointmentRepository;
    private final VisitRecordRepository visitRecordRepository;
    private final ClinicalDocumentRepository clinicalDocumentRepository;
    private final PaymentRepository paymentRepository;

    public AdminReportService(
            AppointmentRepository appointmentRepository,
            VisitRecordRepository visitRecordRepository,
            ClinicalDocumentRepository clinicalDocumentRepository,
            PaymentRepository paymentRepository) {
        this.appointmentRepository = appointmentRepository;
        this.visitRecordRepository = visitRecordRepository;
        this.clinicalDocumentRepository = clinicalDocumentRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public byte[] appointmentReportPdf(Period period, LocalDate baseDate) {
        LocalDate startDate = switch (period) {
            case DAILY -> baseDate;
            case WEEKLY -> baseDate.with(DayOfWeek.MONDAY);
            case MONTHLY -> baseDate.withDayOfMonth(1);
        };
        LocalDate endDate = switch (period) {
            case DAILY -> startDate.plusDays(1);
            case WEEKLY -> startDate.plusDays(7);
            case MONTHLY -> startDate.plusMonths(1);
        };
        var appointments = appointmentRepository.findByStartAtBetweenOrderByStartAtAsc(
                startDate.atStartOfDay(ZONE).toInstant(),
                endDate.atStartOfDay(ZONE).toInstant());
        try {
            return render(period, startDate, endDate.minusDays(1), appointments);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "PDF raporu olusturulamadi");
        }
    }

    private byte[] render(Period period, LocalDate start, LocalDate end, List<Appointment> appointments) throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            List<String> lines = new ArrayList<>();
            lines.add("Sifa Poliklinigi - " + periodText(period) + " Randevu Raporu");
            lines.add("Tarih araligi: " + start + " - " + end);
            lines.add("Toplam randevu: " + appointments.size());
            lines.add(" ");
            int idx = 1;
            for (Appointment a : appointments) {
                var patient = a.getPatient();
                var doctor = a.getDoctor();
                var visit = visitRecordRepository.findByAppointmentId(a.getId()).orElse(null);
                lines.add(idx++ + ") " + toLocalText(a) + " | " + doctor.getClinic().getName());
                lines.add("   Hasta: " + patient.getFirstName() + " " + patient.getLastName() + " (TC: " + patient.getTcKimlik() + ")");
                lines.add("   Doktor: " + doctor.getFullName());
                if (visit != null) {
                    lines.add("   Bulgular: " + nonEmpty(visit.getDiagnosisNotes()));
                    lines.add("   Tedavi: " + nonEmpty(visit.getTreatmentNotes()));
                    var docs = clinicalDocumentRepository.findByVisitIdOrderByCreatedAtAsc(visit.getId());
                    if (!docs.isEmpty()) {
                        lines.add("   Dokumanlar: " + docs.stream().map(d -> d.getDocType().name()).reduce((x, y) -> x + ", " + y).orElse("-"));
                    }
                    var payment = paymentRepository.findByVisitId(visit.getId()).orElse(null);
                    if (payment != null) {
                        lines.add("   Odeme: Tamamlandi - " + money(payment.getNetAmount()) + " TL");
                    } else {
                        lines.add("   Odeme: Henuz odeme yapilmadi");
                    }
                } else {
                    lines.add("   Muayene: Kayit yok");
                    lines.add("   Odeme: Henuz odeme yapilmadi");
                }
                lines.add(" ");
            }
            writePaged(doc, lines);
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static void writePaged(PDDocument doc, List<String> lines) throws IOException {
        int i = 0;
        while (i < lines.size()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setFont(PDType1Font.HELVETICA, 10);
                cs.beginText();
                cs.newLineAtOffset(40, 780);
                int count = 0;
                while (i < lines.size() && count < 50) {
                    cs.showText(ascii(lines.get(i)));
                    cs.newLineAtOffset(0, -14);
                    i++;
                    count++;
                }
                cs.endText();
            }
        }
    }

    private static String toLocalText(Appointment a) {
        return a.getStartAt().atZone(ZONE).format(DT) + " | Durum: " + a.getStatus().name();
    }

    private static String nonEmpty(String s) {
        return s == null || s.isBlank() ? "-" : s;
    }

    private static String money(BigDecimal amount) {
        return amount == null ? "0.00" : amount.toPlainString();
    }

    private static String periodText(Period p) {
        return switch (p) {
            case DAILY -> "Gunluk";
            case WEEKLY -> "Haftalik";
            case MONTHLY -> "Aylik";
        };
    }

    private static String ascii(String s) {
        return s.replace('ç', 'c').replace('Ç', 'C')
                .replace('ğ', 'g').replace('Ğ', 'G')
                .replace('ı', 'i').replace('İ', 'I')
                .replace('ö', 'o').replace('Ö', 'O')
                .replace('ş', 's').replace('Ş', 'S')
                .replace('ü', 'u').replace('Ü', 'U');
    }
}
