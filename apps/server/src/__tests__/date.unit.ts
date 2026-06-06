import {
  getCurrentDay,
  getCurrentDayInTimezone,
  getCurrentTimeInRolloverTimezone,
  ROLLOVER_TIMEZONE,
  getTimeLeftInCurrentDay,
} from "@/domains/games/date";

describe("Date Utilities", () => {
  describe("getCurrentDay", () => {
    it("should return current date in YYYY-MM-DD format using rollover timezone", () => {
      const result = getCurrentDay();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const date = new Date(result);
      expect(date).toBeInstanceOf(Date);
      expect(date.toString()).not.toBe("Invalid Date");
    });

    it("should use the rollover timezone (GMT+9)", () => {
      expect(ROLLOVER_TIMEZONE).toBe("Asia/Tokyo");
    });
  });

  describe("getCurrentDayInTimezone", () => {
    it("should return current date for a specific timezone", () => {
      const utcDay = getCurrentDayInTimezone("UTC");
      const tokyoDay = getCurrentDayInTimezone("Asia/Tokyo");
      const nyDay = getCurrentDayInTimezone("America/New_York");

      expect(utcDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tokyoDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(nyDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getCurrentTimeInRolloverTimezone", () => {
    it("should return current time in rollover timezone", () => {
      const rolloverTime = getCurrentTimeInRolloverTimezone();
      expect(rolloverTime).toBeInstanceOf(Date);
    });
  });

  describe("getTimeLeftInCurrentDay", () => {
    it("should return a time string in HH:MM:SS format", () => {
      const result = getTimeLeftInCurrentDay();
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });
});
