import { ShiftType, RequestStatus, SHIFT_INFO, STATUS_INFO } from '@/types/database';

interface ShiftBadgeProps {
  type: ShiftType;
  showTime?: boolean;
}

export function ShiftBadge({ type, showTime = false }: ShiftBadgeProps) {
  const info = SHIFT_INFO[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${info.className}`}>
      {info.label}
      {showTime && <span className="opacity-75">({info.time})</span>}
    </span>
  );
}

interface StatusBadgeProps {
  status: RequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const info = STATUS_INFO[status];
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}
