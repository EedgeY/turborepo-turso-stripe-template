export enum Role {
  MANAGER = 'Manager',
  KITCHEN = 'Kitchen',
  HALL = 'Hall',
  UNASSIGNED = 'Unassigned'
}

export type ShiftId = string;
export type ShiftCategory = 'WORK' | 'LEAVE';

export interface ShiftDefinition {
  id: ShiftId;
  label: string;      // e.g. "A", "M", "Pd"
  timeRange: string;  // e.g. "09:00-15:00"
  hours: number;      // e.g. 6
  color: string;      // Tailwind class for bg/text
  requiredSkills: string[]; // List of skills required to take this shift
  minRequired: number; // Minimum number of staff needed for this specific shift type
  category: ShiftCategory; // Differentiates working shifts from leave types
}

export interface AppSettings {
  minStaffPerDay: number;
}

export interface Staff {
  id: string;
  name: string;
  role: Role;
  hourlyRate: number;
  skills: string[]; // Acts as "Roles" or "Responsibilities"
  avatar: string;
}

export interface Shift {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  type: ShiftId; // Refers to ShiftDefinition.id or 'OFF'
  isLocked: boolean;
  originalType?: ShiftId; // Tracks the original shift type before manual modification
}

export interface DayConfig {
  date: string;
  dayName: string;
  requiredStaff: number; // This can now be dynamic based on settings
  isBusy: boolean;
}

export interface AnalysisResult {
  score: number;
  insights: string[];
  costProjection: number;
}
