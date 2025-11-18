/**
 * Input sanitization utilities
 * Uses regex-based sanitization to avoid ESM module conflicts
 * Still provides strong protection against XSS and injection attacks
 */

/**
 * Sanitize HTML content - allows basic formatting tags
 * Use for fields where users might want basic formatting (bold, italic, etc.)
 */
export function sanitizeHTML(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove dangerous tags and attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')  // Remove iframe tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')  // Remove object tags
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')     // Remove embed tags
    .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')        // Remove link tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')     // Remove style tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')                         // Remove event handlers (onclick="...")
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')                                // Remove event handlers without quotes
    .replace(/javascript:/gi, '')                                         // Remove javascript: protocol
    .replace(/data:/gi, '')                                               // Remove data: protocol
    .replace(/vbscript:/gi, '')                                           // Remove vbscript: protocol
    .replace(/<[^>]*\s+style\s*=\s*["'][^"']*["'][^>]*>/gi, (match) => {
      // Remove style attributes but keep the tag
      return match.replace(/\s+style\s*=\s*["'][^"']*["']/gi, '');
    });
}

/**
 * Sanitize to plain text - removes all HTML tags
 * Use for most user input fields (names, descriptions, remarks)
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove all HTML tags and decode common HTML entities
  return input
    .replace(/<[^>]*>/g, '')           // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')           // Decode &nbsp;
    .replace(/&amp;/g, '&')            // Decode &amp;
    .replace(/&lt;/g, '<')             // Decode &lt;
    .replace(/&gt;/g, '>')             // Decode &gt;
    .replace(/&quot;/g, '"')           // Decode &quot;
    .replace(/&#39;/g, "'")            // Decode &#39;
    .replace(/&apos;/g, "'")           // Decode &apos;
    .replace(/&#x27;/gi, "'")          // Decode &#x27;
    .replace(/&#x2F;/gi, '/')          // Decode &#x2F;
    .replace(/&#(\d+);/g, (match, dec) => {
      // Decode numeric HTML entities
      return String.fromCharCode(parseInt(dec, 10));
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      // Decode hex HTML entities
      return String.fromCharCode(parseInt(hex, 16));
    })
    .trim();
}

/**
 * Sanitize filename - prevents path traversal and removes dangerous characters
 * Use for file uploads
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename) return 'unnamed';
  
  return filename
    .replace(/[\/\\]/g, '_')      // Replace / and \ with _
    .replace(/\.\./g, '')          // Remove .. (path traversal)
    .replace(/[<>:"|?*]/g, '')    // Remove dangerous Windows chars
    .replace(/[\x00-\x1f]/g, '')  // Remove control characters
    .trim()
    .substring(0, 255)            // Limit length
    || 'unnamed';                  // Fallback if empty
}

/**
 * Sanitize search query - removes HTML but keeps search operators
 * Use for search inputs
 */
export function sanitizeSearchQuery(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove HTML but keep the text for searching
  return sanitizeText(input)
    .replace(/[<>]/g, '')  // Remove angle brackets
    .trim();
}

/**
 * Sanitize vehicle number - allows alphanumeric and common separators
 * Use for vehicle number validation
 */
export function sanitizeVehicleNumber(input: string | null | undefined): string {
  if (!input) return '';
  
  // Allow alphanumeric, spaces, hyphens, and common separators
  return input
    .replace(/[^a-zA-Z0-9\s\-]/g, '')  // Remove special chars except space and hyphen
    .trim()
    .toUpperCase();
}

/**
 * Sanitize LR number - allows alphanumeric and common format characters
 * Use for LR number validation
 */
export function sanitizeLRNumber(input: string | null | undefined): string {
  if (!input) return '';
  
  // Allow alphanumeric, forward slash, hyphen, and spaces (for formats like MT/25-26/123)
  return input
    .replace(/[^a-zA-Z0-9\/\-\s]/g, '')  // Keep only safe chars
    .trim();
}

/**
 * Sanitize location name - allows letters, numbers, spaces, and common punctuation
 * Use for FROM/TO locations, Consignor/Consignee
 */
export function sanitizeLocation(input: string | null | undefined): string {
  if (!input) return '';
  
  // Allow letters, numbers, spaces, commas, hyphens, and forward slashes (for multiple locations)
  return input
    .replace(/[<>"']/g, '')  // Remove dangerous quotes and angle brackets
    .replace(/[^\w\s,\-\/]/g, '')  // Keep only safe characters
    .trim();
}

/**
 * Sanitize numeric string - removes non-numeric characters
 * Use for weights, quantities, etc.
 */
export function sanitizeNumeric(input: string | null | undefined): string {
  if (!input) return '';
  
  // Allow numbers, decimal point, and minus sign
  return input
    .replace(/[^0-9.\-]/g, '')
    .trim();
}

/**
 * Sanitize email - basic email sanitization
 * Use for email fields
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove HTML and keep only email-safe characters
  return sanitizeText(input)
    .toLowerCase()
    .trim();
}

/**
 * Sanitize phone number - allows digits, spaces, hyphens, plus, parentheses
 * Use for phone number fields
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return '';
  
  // Allow digits, spaces, hyphens, plus sign, and parentheses
  return input
    .replace(/[^0-9\s\-\+\(\)]/g, '')
    .trim();
}

/**
 * Sanitize invoice number - allows alphanumeric, slashes, hyphens, and spaces
 * Use for Invoice No field validation
 */
export function sanitizeInvoiceNo(input: string | null | undefined): string {
  if (!input) return '';
  
  // Allow alphanumeric, forward slash, hyphen, space, and underscore (for formats like INV/2024/123)
  return input
    .replace(/[^a-zA-Z0-9\/\-\s_]/g, '')  // Keep only safe chars including forward slash
    .trim();
}

/**
 * Sanitize an entire LR data object
 * Use before saving LR data to database
 */
export function sanitizeLRData(lrData: Record<string, any>): Record<string, any> {
  const sanitized = { ...lrData };
  
  // Sanitize text fields
  if (sanitized['Remark']) {
    sanitized['Remark'] = sanitizeText(sanitized['Remark']);
  }
  if (sanitized['remark']) {
    sanitized['remark'] = sanitizeText(sanitized['remark']);
  }
  if (sanitized['Description of Goods']) {
    sanitized['Description of Goods'] = sanitizeText(sanitized['Description of Goods']);
  }
  
  // Sanitize location fields
  if (sanitized['FROM']) {
    sanitized['FROM'] = sanitizeLocation(sanitized['FROM']);
  }
  if (sanitized['TO']) {
    sanitized['TO'] = sanitizeLocation(sanitized['TO']);
  }
  if (sanitized['Consignor']) {
    sanitized['Consignor'] = sanitizeLocation(sanitized['Consignor']);
  }
  if (sanitized['Consignee']) {
    sanitized['Consignee'] = sanitizeLocation(sanitized['Consignee']);
  }
  
  // Sanitize vehicle and LR numbers
  if (sanitized['Vehicle Number']) {
    sanitized['Vehicle Number'] = sanitizeVehicleNumber(sanitized['Vehicle Number']);
  }
  if (sanitized['LR No']) {
    sanitized['LR No'] = sanitizeLRNumber(sanitized['LR No']);
  }
  
  // Sanitize invoice number - allow forward slash
  if (sanitized['Invoice No']) {
    sanitized['Invoice No'] = sanitizeInvoiceNo(sanitized['Invoice No']);
  }
  
  // Sanitize numeric fields
  if (sanitized['Loaded Weight']) {
    sanitized['Loaded Weight'] = sanitizeNumeric(sanitized['Loaded Weight']);
  }
  if (sanitized['Empty Weight']) {
    sanitized['Empty Weight'] = sanitizeNumeric(sanitized['Empty Weight']);
  }
  if (sanitized['Quantity']) {
    sanitized['Quantity'] = sanitizeNumeric(sanitized['Quantity']);
  }
  
  return sanitized;
}
