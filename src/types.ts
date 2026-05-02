
export interface Employee {
  id: string;
  name: string;
  position: string;
}

export interface AttendanceRecord {
  employeeId: string;
  date: string; // ISO format (YYYY-MM-DD)
  status: 'present' | 'absent' | 'custom';
  value?: string; // e.g., "8", "4", "1/2", "?"
  comment?: string;
  isLocked?: boolean;
}

export interface MonthlyData {
  month: string; // YYYY-MM
  records: AttendanceRecord[];
}
