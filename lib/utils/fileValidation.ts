/**
 * File validation utilities
 * Validates file content using magic bytes (file signatures) to prevent spoofed Content-Type attacks
 */

// Magic bytes (file signatures) for allowed file types
const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46], // %PDF
  ],
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP starts with RIFF)
  ],
};

// WebP requires additional check (RIFF...WEBP)
const WEBP_CHECK = [0x57, 0x45, 0x42, 0x50]; // WEBP

/**
 * Detect file type from magic bytes
 * Returns the MIME type if detected, null otherwise
 */
export function detectFileType(buffer: Buffer): string | null {
  if (buffer.length < 4) {
    return null;
  }

  // Check PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // Check JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // Check PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // Check WebP (RIFF...WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Validate file content matches declared Content-Type
 * Returns true if valid, false otherwise
 */
export function validateFileContent(buffer: Buffer, declaredContentType: string): boolean {
  const detectedType = detectFileType(buffer);
  
  if (!detectedType) {
    return false;
  }

  // Normalize content types for comparison
  const normalizedDeclared = declaredContentType.toLowerCase().trim();
  const normalizedDetected = detectedType.toLowerCase().trim();

  return normalizedDeclared === normalizedDetected;
}

/**
 * Validate LR number format to prevent path traversal
 */
export function validateLRNumber(lrNo: string): boolean {
  if (!lrNo || typeof lrNo !== 'string') {
    return false;
  }

  // Check for path traversal sequences
  if (lrNo.includes('..') || lrNo.includes('/') || lrNo.includes('\\')) {
    return false;
  }

  // Check for null bytes or control characters
  if (lrNo.includes('\0') || /[\x00-\x1F]/.test(lrNo)) {
    return false;
  }

  // LR numbers should be reasonable length (adjust as needed)
  if (lrNo.length > 100) {
    return false;
  }

  return true;
}

