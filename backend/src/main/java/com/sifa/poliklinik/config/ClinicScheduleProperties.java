package com.sifa.poliklinik.config;

import java.time.LocalTime;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sifa.clinic")
public class ClinicScheduleProperties {

    private int slotMinutes = 30;
    private LocalTime dayStart = LocalTime.of(9, 0);
    private LocalTime dayEnd = LocalTime.of(17, 0);
    private LocalTime lunchStart = LocalTime.of(12, 0);
    private LocalTime lunchEnd = LocalTime.of(13, 0);
    private int alternativeDaysRange = 14;

    public int getSlotMinutes() {
        return slotMinutes;
    }

    public void setSlotMinutes(int slotMinutes) {
        this.slotMinutes = slotMinutes;
    }

    public LocalTime getDayStart() {
        return dayStart;
    }

    public void setDayStart(LocalTime dayStart) {
        this.dayStart = dayStart;
    }

    public LocalTime getDayEnd() {
        return dayEnd;
    }

    public void setDayEnd(LocalTime dayEnd) {
        this.dayEnd = dayEnd;
    }

    public LocalTime getLunchStart() {
        return lunchStart;
    }

    public void setLunchStart(LocalTime lunchStart) {
        this.lunchStart = lunchStart;
    }

    public LocalTime getLunchEnd() {
        return lunchEnd;
    }

    public void setLunchEnd(LocalTime lunchEnd) {
        this.lunchEnd = lunchEnd;
    }

    public int getAlternativeDaysRange() {
        return alternativeDaysRange;
    }

    public void setAlternativeDaysRange(int alternativeDaysRange) {
        this.alternativeDaysRange = alternativeDaysRange;
    }
}
