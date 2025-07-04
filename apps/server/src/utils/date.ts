import { format, isValid } from 'date-fns';

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDay(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function isValidDateString(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return isValid(date);
}

/**
 * Get date string from timestamp
 */
export function getDateFromTimestamp(timestamp: number): string {
  return format(new Date(timestamp), 'yyyy-MM-dd');
}

/**
 * Calculate TTL timestamp (seconds since epoch) for given days from now
 */
export function getTTL(daysFromNow: number): number {
  const now = new Date();
  const ttlDate = new Date(now.getTime() + (daysFromNow * 24 * 60 * 60 * 1000));
  return Math.floor(ttlDate.getTime() / 1000);
}

/**
 * Generate a consistent partition key for DynamoDB
 */
export function generatePartitionKey(type: string, ...parts: string[]): string {
  return [type, ...parts].join('#');
}

/**
 * Parse partition key components
 */
export function parsePartitionKey(pk: string): string[] {
  return pk.split('#');
}
