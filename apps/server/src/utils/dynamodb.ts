/**
 * DynamoDB utility functions
 */

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
