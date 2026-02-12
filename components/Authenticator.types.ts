import { JSX } from 'react';

export interface Account {
  id: number;
  name: string;
  email: string;
  secret: string; // Encrypted secret stored in AsyncStorage
  deleted?: boolean; // Soft delete flag for cloud
  deletedAt?: number; // Timestamp when deleted
}

export interface User {
  id: string;
}

export interface ParsedOTPAuth {
  secret: string;
  issuer: string;
  label: string;
}

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

export interface CloudAccount {
  id: number;
  name: string;
  email: string;
  secret: string;
  deleted: boolean; // REQUIRED
  deletedAt?: number;
}

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