import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const MASTER_KEY_NAME = 'AUTH_MASTER_KEY';

/**
 * Get or create a device-bound master key
 */
async function getMasterKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(MASTER_KEY_NAME);
  if (!key) {
    // Generate a secure 256-bit key using UUIDs
    const uuid1 = Crypto.randomUUID();
    const uuid2 = Crypto.randomUUID();
    key = uuid1 + uuid2;
    await SecureStore.setItemAsync(MASTER_KEY_NAME, key);
  }
  return key;
}

/**
 * Convert string to hex
 */
function stringToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hex += charCode.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Convert hex to string
 */
function hexToString(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    const charCode = parseInt(hex.substr(i, 2), 16);
    str += String.fromCharCode(charCode);
  }
  return str;
}

/**
 * XOR encryption/decryption using hex encoding
 */
function xorEncryptDecrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/**
 * Encrypt secret before storage (reversible encryption)
 */
export async function encryptSecret(secret: string, storageKey: string): Promise<string> {
  try {
    if (!secret || secret.trim().length === 0) {
      throw new Error('Secret cannot be empty');
    }
    
    const masterKey = await getMasterKey();
    const encrypted = xorEncryptDecrypt(secret, masterKey);
    const hexEncrypted = stringToHex(encrypted);
    
    return hexEncrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt secret for TOTP generation
 */
export async function decryptSecret(encrypted: string): Promise<string> {
  try {
    if (!encrypted || encrypted.trim().length === 0) {
      throw new Error('Encrypted data cannot be empty');
    }
    
    const masterKey = await getMasterKey();
    const decrypted = hexToString(encrypted);
    const plaintext = xorEncryptDecrypt(decrypted, masterKey);
    
    if (!plaintext || plaintext.trim().length === 0) {
      throw new Error('Decryption resulted in empty string');
    }
    
    return plaintext;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

/**
 * Hash secret for validation purposes (one-way, non-reversible)
 */
export async function hashSecret(secret: string): Promise<string> {
  const masterKey = await getMasterKey();
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${secret}:${masterKey}`
  );
}