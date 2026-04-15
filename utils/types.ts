import { JSX } from 'react';

// ===== User & Auth Types =====

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthError {
  code: string;
  message: string;
}

// ===== Authenticator Account Types =====

export interface Account {
  id: number;
  name: string;
  email: string;
  secret: string; // Encrypted secret stored in AsyncStorage
  deleted?: boolean; // Soft delete flag for cloud
  deletedAt?: number; // Timestamp when deleted
}

export interface CloudAccount {
  id: number;
  name: string;
  email: string;
  secret: string;
  deleted: boolean; // REQUIRED for cloud
  deletedAt?: number;
}

export interface ParsedOTPAuth {
  secret: string;
  issuer: string;
  label: string;
}

// ===== Password Vault Types =====

export type SavedAccount = {
  id: string;
  accountName: string;
  username: string;
  password: string;
  createdAt: number;
};

export type PasswordOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

// ===== Component Prop Types =====

export interface AccountCardProps extends Account {
  timeLeft: number;
  onDelete: () => void;
}

export interface FabSubButtonProps {
  icon: JSX.Element;
  label: string;
  onPress: () => void;
}

export interface QRScannerProps {
  onScanned: (data: string) => void;
  onClose: () => void;
}

export interface ManualEntryModalProps {
  onSave: (name: string, email: string, secret: string) => void;
  onClose: () => void;
}

// ===== Color Theme =====

export const colors = {
  appBg: '#000000',
  cardBg: '#111111',
  cardBorder: '#2a2a2a',
  textStrong: '#e6e6e6',
  textDim: '#9a9a9a',
  textMuted: '#666666',
  accent: '#bfc3c7',
  accentDark: '#8b8f94',
  success: '#22c55e',
  inputBg: '#1a1a1a',
  cardBg1: '#1a1a1a',
  accent1: '#e6e6e6',
};
