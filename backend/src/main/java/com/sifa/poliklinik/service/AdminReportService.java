package com.sifa.poliklinik.service;

import com.sifa.poliklinik.domain.Appointment;
import com.sifa.poliklinik.repository.AppointmentRepository;
import com.sifa.poliklinik.repository.ClinicalDocumentRepository;
import com.sifa.poliklinik.repository.PaymentRepository;
import com.sifa.poliklinik.repository.VisitRecordRepository;
import com.sifa.poliklinik.domain.AppointmentStatus;
import com.sifa.poliklinik.web.dto.AppointmentResponseDto;
import com.sifa.poliklinik.web.DtoMapper;
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

        var activeAppointments = appointments.stream()
                .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
                .toList();

        try {
            return render(period, startDate, endDate.minusDays(1), activeAppointments);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "PDF raporu olusturulamadi");
        }
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponseDto> appointmentReportData(Period period, LocalDate baseDate) {
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

        var activeAppointments = appointments.stream()
                .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
                .toList();

        var visits = visitRecordRepository.findByAppointmentIn(activeAppointments);
        var payments = paymentRepository.findByVisitIn(visits);

        var apptToVisitMap = visits.stream().collect(java.util.stream.Collectors.toMap(
                v -> v.getAppointment().getId(),
                com.sifa.poliklinik.domain.VisitRecord::getId,
                (v1, v2) -> v1
        ));

        var paidVisitIds = payments.stream().map(p -> p.getVisit().getId()).collect(java.util.stream.Collectors.toSet());

        return activeAppointments.stream().map(a -> {
            Long visitId = apptToVisitMap.get(a.getId());
            boolean paid = visitId != null && paidVisitIds.contains(visitId);
            return DtoMapper.appointment(a, visitId, paid);
        }).toList();
    }

    private byte[] render(Period period, LocalDate start, LocalDate end, List<Appointment> appointments) throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            int rowsPerPage = 22;
            int totalPages = (int) Math.ceil((double) appointments.size() / rowsPerPage);
            if (totalPages == 0) totalPages = 1;
            
            for (int pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                PDPage page = new PDPage();
                doc.addPage(page);
                
                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    // Header Banner
                    cs.setNonStrokingColor(30, 58, 138); // Royal Blue #1E3A8A
                    cs.addRect(40, 740, 515, 50);
                    cs.fill();
                    
                    cs.setNonStrokingColor(255, 255, 255);
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 14);
                    cs.beginText();
                    cs.newLineAtOffset(55, 760);
                    cs.showText(ascii("SIFA SAGLIK GRUBU - RANDEVU RAPORU"));
                    cs.endText();
                    
                    // Report Metadata below banner
                    cs.setNonStrokingColor(50, 50, 50);
                    cs.setFont(PDType1Font.HELVETICA, 10);
                    cs.beginText();
                    cs.newLineAtOffset(45, 715);
                    cs.showText(ascii("Rapor Tipi: " + periodText(period) + " | Tarih Araligi: " + start + " - " + end));
                    cs.endText();
                    
                    cs.beginText();
                    cs.newLineAtOffset(400, 715);
                    cs.showText(ascii("Toplam Randevu: " + appointments.size() + " | Sayfa: " + (pageIndex + 1) + "/" + totalPages));
                    cs.endText();
                    
                    // Draw Table Header
                    float startY = 680;
                    cs.setNonStrokingColor(30, 58, 138); // Royal Blue
                    cs.addRect(40, startY, 515, 20);
                    cs.fill();
                    
                    cs.setNonStrokingColor(255, 255, 255);
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 8);
                    
                    float xNo = 40;
                    float xTarih = 65;
                    float xHasta = 160;
                    float xDoktor = 290;
                    float xDurum = 420;
                    float xOdeme = 495;
                    
                    drawCellText(cs, "No", xNo, startY, 25);
                    drawCellText(cs, "Tarih/Saat", xTarih, startY, 95);
                    drawCellText(cs, "Hasta (TC)", xHasta, startY, 130);
                    drawCellText(cs, "Doktor (Klinik)", xDoktor, startY, 130);
                    drawCellText(cs, "Durum", xDurum, startY, 75);
                    drawCellText(cs, "Odeme", xOdeme, startY, 60);
                    
                    // Draw Rows
                    int startIndex = pageIndex * rowsPerPage;
                    int endIndex = Math.min(startIndex + rowsPerPage, appointments.size());
                    
                    float currentY = startY - 20;
                    cs.setFont(PDType1Font.HELVETICA, 8);
                    
                    for (int i = startIndex; i < endIndex; i++) {
                        Appointment a = appointments.get(i);
                        var patient = a.getPatient();
                        var doctor = a.getDoctor();
                        var clinic = doctor.getClinic();
                        
                        // Alternate row backgrounds
                        if (i % 2 == 0) {
                            cs.setNonStrokingColor(240, 244, 255); // Very light royal blue
                            cs.addRect(40, currentY, 515, 20);
                            cs.fill();
                        }
                        
                        cs.setNonStrokingColor(30, 30, 30);
                        
                        // Get billing and visit info
                        var visit = visitRecordRepository.findByAppointmentId(a.getId()).orElse(null);
                        String paidText = "Odenmedi";
                        if (visit != null) {
                            var payment = paymentRepository.findByVisitId(visit.getId()).orElse(null);
                            if (payment != null) {
                                paidText = money(payment.getNetAmount()) + " TL";
                            }
                        }
                        
                        // Status mapping
                        String statusStr = switch (a.getStatus()) {
                            case SCHEDULED -> "Muayene Bekliyor";
                            case COMPLETED -> "Muayene Edildi";
                            case CANCELLED -> "Iptal Edildi";
                            case NO_SHOW -> "Gelmedi";
                        };
                        
                        String hastaStr = patient.getFirstName() + " " + patient.getLastName() + " (" + patient.getTcKimlik() + ")";
                        String drStr = doctor.getFullName() + " (" + clinic.getName() + ")";
                        
                        drawCellText(cs, String.valueOf(i + 1), xNo, currentY, 25);
                        drawCellText(cs, toLocalTimeText(a), xTarih, currentY, 95);
                        drawCellText(cs, truncate(hastaStr, 28), xHasta, currentY, 130);
                        drawCellText(cs, truncate(drStr, 28), xDoktor, currentY, 130);
                        drawCellText(cs, statusStr, xDurum, currentY, 75);
                        drawCellText(cs, paidText, xOdeme, currentY, 60);
                        
                        // Draw horizontal line at row bottom
                        cs.setStrokingColor(220, 220, 220);
                        cs.moveTo(40, currentY);
                        cs.lineTo(555, currentY);
                        cs.stroke();
                        
                        currentY -= 20;
                    }
                }
            }
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static void drawCellText(PDPageContentStream cs, String text, float x, float y, float width) throws IOException {
        cs.beginText();
        cs.newLineAtOffset(x + 4, y + 6); // padding
        cs.showText(ascii(text));
        cs.endText();
    }

    private static String truncate(String text, int maxLength) {
        if (text == null) return "";
        if (text.length() <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
    }

    private static String toLocalTimeText(Appointment a) {
        return a.getStartAt().atZone(ZONE).format(DT);
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
