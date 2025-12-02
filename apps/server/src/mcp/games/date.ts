/**
 * Date utilities with rollover timezone support
 * 
 * This module implements a "rollover timezone" concept where all date calculations
 * for daily game boundaries (events, leaderboards, etc.) use GMT+9:00 timezone.
 * 
 * Rollover times in major timezones:
 * - US East Coast: 11:00 AM EST / 12:00 PM EDT
 * - US West Coast: 8:00 AM PST / 9:00 AM PDT  
 * - Europe (CET): 5:00 PM CET / 6:00 PM CEST
 * - Asia/Tokyo: 12:00 AM JST (midnight)
 * 
 * This ensures daily boundaries occur at reasonable times for US and European users
 * while maintaining global consistency.
 */

import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Rollover timezone: GMT+9:00 (JST) - days roll over at a reasonable time for US and Europe
// A day is subtracted from this date
export const ROLLOVER_TIMEZONE = 'Asia/Tokyo'; // GMT+9:00

/**
 * Get current date in YYYY-MM-DD format using the rollover timezone (GMT+9:00)
 * A day is subtracted from this date to ensure it rolls over at the correct date.
 * 
 * This ensures that days roll over at a reasonable time for US and Europe users.
 */
export function getCurrentDay(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1); // Subtract one day to align with rollover
  const zonedTime = toZonedTime(now, ROLLOVER_TIMEZONE);
  return format(zonedTime, 'yyyy-MM-dd');
}

/**
 * Get the time left in the current day
 * This calculates the time remaining until the end of the day in the rollover timezone.
 */
export function getTimeLeftInCurrentDay(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1); // Subtract one day to align with rollover
  const zonedTime = toZonedTime(now, ROLLOVER_TIMEZONE);
  const endOfDay = new Date(zonedTime.getFullYear(), zonedTime.getMonth(), zonedTime.getDate(), 23, 59, 59, 999);
  const milliseconds = Math.max(0, endOfDay.getTime() - zonedTime.getTime());

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Get current date in YYYY-MM-DD format for a specific timezone
 */
export function getCurrentDayInTimezone(timezone: string): string {
  const now = new Date();
  const zonedTime = toZonedTime(now, timezone);
  return format(zonedTime, 'yyyy-MM-dd');
}

/**
 * Get the current time in the rollover timezone
 */
export function getCurrentTimeInRolloverTimezone(): Date {
  return toZonedTime(new Date(), ROLLOVER_TIMEZONE);
}
