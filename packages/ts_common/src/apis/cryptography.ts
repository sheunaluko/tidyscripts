import stringify from 'fast-json-stable-stringify';

/**
 * Computes the SHA-256 hash of the input text.
 * @param text - The input text to hash.
 * @returns A promise that resolves to the SHA-256 hash of the text in hexadecimal format.
 */
export async function sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    // Using the subtle crypto API to compute the SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return buffer_to_hex(hashBuffer);
}



/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param buffer - The ArrayBuffer to convert.
 * @returns The hexadecimal string representation of the buffer.
 */
export function buffer_to_hex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}



/**
 * Deterministically Computes the sha256 hash of any object 
 * 
 * Uses deterministic json stringify to ensure consistency regardless of key order 
 * 
 * @param o - The object to hash
 * @returns The sha256 hash 
 */
export async function object_sha256(o : object ): Promise<string> {
    return await sha256( stringify(o) ) ; 
}



/**
 * Generates a UUID v5-like identifier by hashing text with SHA-256.
 * @param text The input text.
 * @returns A UUID string.
 */
export async function uuid_from_text(text: string): Promise<string> {

  // -- 
  const hashHex = await sha256(text);

  // Use first 32 hex characters (128 bits) for UUID
  const hex = hashHex.slice(0, 32);

  // Format into UUID: 8-4-4-4-12
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');

  return uuid;
}
