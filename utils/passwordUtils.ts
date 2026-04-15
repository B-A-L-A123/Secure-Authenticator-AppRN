import * as Crypto from 'expo-crypto';
import type { PasswordOptions } from './types';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Get a cryptographically secure random index
 */
function secureRandomIndex(max: number): number {
  const bytes = Crypto.getRandomBytes(4);
  const value = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return value % max;
}

/**
 * Generate a random password based on the given options
 */
export function generatePassword(options: PasswordOptions): string {
  let charset = '';
  if (options.lowercase) charset += LOWER;
  if (options.uppercase) charset += UPPER;
  if (options.numbers) charset += NUMBERS;
  if (options.symbols) charset += SYMBOLS;

  if (!charset) return '';

  let password = '';
  for (let i = 0; i < options.length; i++) {
    const index = secureRandomIndex(charset.length);
    password += charset[index];
  }
  return password;
}

/**
 * Analyze password strength and return strength label, color, and numeric score
 */
export function analyzePasswordStrength(password: string): {
  strength: string;
  color: string;
  score: number;
} {
  if (!password) return { strength: 'None', color: '#666', score: 0 };

  let score = 0;

  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 3) return { strength: 'WEAK', color: '#ef4444', score: 1 };
  if (score <= 5) return { strength: 'MODERATE', color: '#f97316', score: 2 };
  return { strength: 'STRONG', color: '#22c55e', score: 3 };
}
