export interface ValidationResult {
  isValid: boolean;
  error?: string;
}


//  Encodes a UTF-8 text string to Base64 format
export function encodeToBase64(text: string): string {
  try {
    // Handle edge cases gracefully
    if (text === null || text === undefined) {
      throw new Error('Input text cannot be null or undefined');
    }
    
    const utf8Bytes = new TextEncoder().encode(text);
    const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } catch (error) {
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('null') || error.message.includes('undefined')) {
        throw error; // Re-throw our custom error
      }
      // Handle TextEncoder or btoa specific errors
      throw new Error('Failed to encode text to Base64. Please check your input for unsupported characters.');
    }
    throw new Error('Failed to encode text to Base64');
  }
}

// Decodes a Base64 string back to UTF-8 text
export function decodeFromBase64(base64: string): string {
  try {
    // Handle edge cases gracefully
    if (base64 === null || base64 === undefined) {
      throw new Error('Input Base64 string cannot be null or undefined');
    }
    
    if (!base64 || base64.length === 0) return '';

    const validation = isValidBase64(base64);
    if (!validation.isValid) throw new Error(validation.error || 'Invalid Base64 format');

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Handle TextDecoder errors gracefully
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error types with more descriptive messages
      if (error.message.includes('null') || error.message.includes('undefined')) {
        throw error; // Re-throw our custom error
      }
      if (error.message.includes('Invalid Base64') || error.message.includes('format')) {
        throw error; // Re-throw validation errors as-is
      }
      if (error.name === 'TypeError' && error.message.includes('decode')) {
        throw new Error('Invalid UTF-8 sequence in decoded data. The Base64 string may contain corrupted data.');
      }
      if (error.message.includes('character') || error.message.includes('atob')) {
        throw new Error('Invalid Base64 format. Please check your input contains only valid Base64 characters.');
      }
      throw error; // Re-throw other known errors
    }
    throw new Error('Failed to decode Base64 string');
  }
}


// Validates if a string is a valid Base64 format
export function isValidBase64(str: string): ValidationResult {
  if (!str || str.length === 0) {
    return { isValid: true };
  }

  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  if (!base64Regex.test(str)) {
    return {
      isValid: false,
      error: 'Invalid Base64 format. Only A-Z, a-z, 0-9, +, /, and = characters are allowed'
    };
  }

  // Check if length is multiple of 4 (Base64 requirement)
  if (str.length % 4 !== 0) {
    const paddedStr = str + '='.repeat((4 - (str.length % 4)) % 4);
    if (paddedStr.length % 4 !== 0) {
      return {
        isValid: false,
        error: 'Invalid Base64 format. Length must be a multiple of 4'
      };
    }
  }

  const paddingMatch = str.match(/=+$/);
  if (paddingMatch && paddingMatch[0].length > 2) {
    return {
      isValid: false,
      error: 'Invalid Base64 format. Too many padding characters'
    };
  }

  // Check that = only appears at the end
  if (str.includes('=') && !str.endsWith('=') && !str.endsWith('==')) {
    return {
      isValid: false,
      error: 'Invalid Base64 format. Padding characters can only appear at the end'
    };
  }

  return { isValid: true };
}

// Validates text input for encoding
export function validateTextInput(text: string): ValidationResult {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: 'Please enter text to encode'
    };
  }

  return { isValid: true };
}

// Validates Base64 input for decoding
export function validateBase64Input(base64: string): ValidationResult {
  if (!base64 || base64.trim().length === 0) {
    return {
      isValid: false,
      error: 'Please enter Base64 text to decode'
    };
  }

  return isValidBase64(base64.trim());
}
