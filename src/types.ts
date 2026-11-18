export interface Student {
  id: number;
  student_code: string;
  full_name: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
}

export interface SessionCreate {
  course_id: number;
  latitude: number;
  longitude: number;
  radius_m: number;
  duration_minutes: number;
}

export interface SessionResponse {
  id: number;
  course_id: number;
  starts_at: string;
  ends_at: string;
  radius_m: number;
}

export interface SessionQR {
  session_id: number;
  qr_token: string;
  expires_at: string;
  note: string;
}

export interface AttendanceScan {
  student_id: number;
  qr_token: string;
  latitude: number;
  longitude: number;
}

export interface ScanResult {
  message: string;
  attendance_id: number;
  student_id: number;
  session_id: number;
  marked_at: string;
  distance_m: number;
}

export interface SessionAttendanceItem {
  attendance_id: number;
  student_id: number;
  student_code: string;
  full_name: string;
  marked_at: string;
  distance_m: number;
}

export interface StudentAttendanceItem {
  attendance_id: number;
  course_id: number;
  course_code: string;
  course_name: string;
  session_id: number;
  marked_at: string;
  distance_m: number;
}
