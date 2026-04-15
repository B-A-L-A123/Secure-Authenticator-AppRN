import type { ParsedOTPAuth } from './types';

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password meets minimum requirements
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

/**
 * Validate a Base32-encoded string
 */
export function isValidBase32(str: string): boolean {
  const cleaned = str.replace(/\s/g, '').toUpperCase();
  return /^[A-Z2-7]+=*$/.test(cleaned);
}

/**
 * Parse an otpauth:// URI into its components
 */
export function parseOTPAuthURI(uri: string): ParsedOTPAuth {
  const match = uri.match(/otpauth:\/\/totp\/([^?]+)\?secret=([A-Z2-7]+)/i);
  if (!match) {
    return { secret: '', issuer: '', label: '' };
  }

  const label = decodeURIComponent(match[1]);
  const secret = match[2];
  const parts = label.split(':');

  return {
    secret,
    issuer: parts.length > 1 ? parts[0] : '',
    label: parts.length > 1 ? parts[1] : parts[0],
  };
}

/**
 * Get user-friendly error message for Firebase auth errors
 */
export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error.code || '';

  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please register first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email and password.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};
