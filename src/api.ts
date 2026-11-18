import type {
  AttendanceScan,
  Course,
  ScanResult,
  SessionAttendanceItem,
  SessionCreate,
  SessionQR,
  SessionResponse,
  Student,
  StudentAttendanceItem,
} from './types'

// API Base URL (strips trailing slashes to prevent double slashes like '//courses')
const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://attendancehub-jke7.onrender.com'
const BASE_URL = rawBaseUrl.replace(/\/+$/, '')

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'Unknown error'
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') {
        errorDetail = data.detail
      } else if (typeof data.detail === 'object') {
        errorDetail = data.detail.message || JSON.stringify(data.detail)
      } else {
        errorDetail = JSON.stringify(data)
      }
    } catch {
      errorDetail = `${res.status} ${res.statusText}`
    }
    throw new Error(errorDetail)
  }
  return res.json()
}

export const api = {
  // Students
  getStudents: (): Promise<Student[]> =>
    fetch(`${BASE_URL}/students`).then((r) => handleResponse<Student[]>(r)),

  createStudent: (data: { student_code: string; full_name: string }): Promise<Student> =>
    fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Student>(r)),

  getStudentAttendance: (studentId: number): Promise<StudentAttendanceItem[]> =>
    fetch(`${BASE_URL}/students/${studentId}/attendance`).then((r) =>
      handleResponse<StudentAttendanceItem[]>(r)
    ),

  // Courses
  getCourses: (): Promise<Course[]> =>
    fetch(`${BASE_URL}/courses`).then((r) => handleResponse<Course[]>(r)),

  createCourse: (data: { code: string; name: string }): Promise<Course> =>
    fetch(`${BASE_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Course>(r)),

  // Sessions
  createSession: (data: SessionCreate): Promise<SessionResponse> =>
    fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<SessionResponse>(r)),

  getSessionQR: (sessionId: number): Promise<SessionQR> =>
    fetch(`${BASE_URL}/sessions/${sessionId}/qr`).then((r) => handleResponse<SessionQR>(r)),

  getSessionAttendance: (sessionId: number): Promise<SessionAttendanceItem[]> =>
    fetch(`${BASE_URL}/sessions/${sessionId}/attendance`).then((r) =>
      handleResponse<SessionAttendanceItem[]>(r)
    ),

  // Attendance Scan
  scanAttendance: (data: AttendanceScan): Promise<ScanResult> =>
    fetch(`${BASE_URL}/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<ScanResult>(r)),
}
