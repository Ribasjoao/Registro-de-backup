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
export type Criticality = 'low' | 'medium' | 'high' | 'critical';
export type RootCause = 'network' | 'storage' | 'credential' | 'service' | 'window' | 'human' | 'other';
export type Impact = 'low' | 'medium' | 'high';
export type TreatmentStatus = 'pending' | 'analyzing' | 'mitigated' | 'resolved';

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
  
  // Executive reporting fields
  criticality?: Criticality;
  rootCause?: RootCause;
  impact?: Impact;
  treatmentStatus?: TreatmentStatus;
  actionDeadline?: string;
  recurrence?: boolean;
  responsibleTreatment?: string;
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

export type TaskStatus = 'inbox' | 'today' | 'doing' | 'waiting' | 'blocked' | 'done';
export type TaskType = 'rotina' | 'incidente' | 'plano_de_acao' | 'follow_up' | 'apresentacao' | 'melhoria';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskSource = 'manual' | 'incident' | 'recurrent' | 'automatic';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskRecurrence {
  type: 'daily' | 'business' | 'weekly' | 'monthly' | 'fridays' | 'none';
  daysOfWeek?: number[];
  lastGenerated?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  userId: string;
  dueDate?: string;
  slaDate?: string;
  important?: boolean;
  tags?: string[];
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  duration?: number;
  
  // Connections
  relatedBackupId?: string;
  relatedClient?: string;
  relatedRecordTitle?: string;
  
  // Operational fields
  owner: string;
  blockedReason?: string;
  source: TaskSource;
  recurrence?: TaskRecurrence;
  checklist?: TaskChecklistItem[];
  notes?: string;
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
