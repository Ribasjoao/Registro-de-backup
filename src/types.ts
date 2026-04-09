export interface AppUser {
  id: string;
  uid: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  xp?: number;
  level?: string;
  displayName?: string;
  photoURL?: string;
}

export interface XPHistory {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: string;
}

export type BackupStatus = 'success' | 'warning' | 'failed';

export interface BackupRecord {
  id: string;
  status: BackupStatus;
  client: string;
  category: string;
  title: string;
  technicalAnalysis?: string;
  actionPlan?: string;
  timestamp: string;
  responsible: string;
  backupType?: string; // New field for Local/Cloud/etc.
}

export interface BackupType {
  id: string;
  name: string;
}

export interface Client {
  id: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  userId: string;
  dueDate?: string;
  important?: boolean;
  tags?: string[];
  status: 'inbox' | 'doing' | 'done';
  duration?: number; // in minutes
  isGolden?: boolean;
}

export type RepositoryType = 'Cloud' | 'On-Premise' | 'Remote';
export type SpaceStatus = 'Healthy' | 'Warning' | 'Critical';

export interface StorageDestination {
  id: string;
  name: string;
  client: string;
  freeSpaceTB: number;
  usedSpaceTB: number;
  totalSpaceTB: number;
  savingsPercent: number;
  savingsTB: number;
  backupsCount: number;
  location: 'Local' | 'S3' | 'Cloud';
}
