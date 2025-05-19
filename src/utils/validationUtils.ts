
/**
 * Validates if a string is a valid UUID
 * @param id The string to validate as UUID
 * @returns true if the string is a valid UUID, false otherwise
 */
export function isValidUUID(id: any): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // UUID v4 regex pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

/**
 * Ensure a value is a valid UUID or null
 * Useful for database operations that require either a valid UUID or null
 * @param value The value to validate
 * @returns The original value if it's a valid UUID, null otherwise
 */
export function ensureValidUUIDOrNull(value: any): string | null {
  return isValidUUID(value) ? value : null;
}
