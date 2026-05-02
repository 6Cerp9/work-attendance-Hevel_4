export interface AttendanceMark {
  value: string; // "+", "-", "?", or number
  comment?: string;
  locked?: boolean;
}

export interface Worker {
  id: string;
  name: string;
}

export interface MonthData {
  [workerId: string]: {
    [day: string]: AttendanceMark;
  };
}

export interface AppState {
  workers: Worker[];
  attendance: {
    [monthKey: string]: MonthData; // monthKey format: "YYYY-MM"
  };
}
