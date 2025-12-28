// Database types for the shift management system

export type UserRole = 'worker' | 'admin';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type ShiftType = '1' | '2' | '3';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  date: string;
  shift_type: ShiftType;
  status: RequestStatus;
  created_at: string;
  // Joined data
  user?: User;
}

export interface Absence {
  id: string;
  shift_id: string;
  reason: string;
  replacement_user_id: string | null;
  status: RequestStatus;
  created_at: string;
  // Joined data
  shift?: Shift;
  replacement_user?: User;
}

// Shift info helper
export const SHIFT_INFO: Record<ShiftType, { label: string; time: string; className: string }> = {
  '1': { label: 'Prva', time: '08:00 – 16:00', className: 'shift-first' },
  '2': { label: 'Druga', time: '16:00 – 00:00', className: 'shift-second' },
  '3': { label: 'Treća', time: '00:00 – 08:00', className: 'shift-third' },
};

export const STATUS_INFO: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: 'Na čekanju', className: 'status-pending' },
  approved: { label: 'Odobreno', className: 'status-approved' },
  rejected: { label: 'Odbijeno', className: 'status-rejected' },
};
