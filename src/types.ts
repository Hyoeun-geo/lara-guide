export interface Student {
  id: string;
  grade: number;
  classNum: number;
  num: number;
  name: string;
}

export interface TeacherRecord {
  id: string;
  studentId: string;
  teacherName: string;
  date: string;
  cat1: string;
  cat2: string;
  otherDetail: string;
  detail: string;
  received: boolean;
  timestamp: number;
}

export interface CommitteeReferral {
  id: string;
  studentId: string;
  studentName: string;
  round: string; // e.g. "1차" or "2차"
  date: string;
  selectedCardIds: string[];
  note: string;
  timestamp: number;
  teacherName: string;
  cycleResetApplied?: boolean;
}

export interface User {
  name: string;
  pin: string | number;
  role: 'admin' | 'teacher';
}

export interface AppState {
  users: User[];
  records: TeacherRecord[];
  studentCycles: Record<string, number>;
  referrals?: CommitteeReferral[];
}
