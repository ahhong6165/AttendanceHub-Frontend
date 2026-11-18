import type {
  AdminUser,
  AttendanceScan,
  AuthResponse,
  ClassroomLocation,
  Course,
  ScanResult,
  SessionAttendanceItem,
  SessionCreate,
  SessionQR,
  SessionResponse,
  Student,
  StudentAttendanceItem,
} from './types'

const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://attendancehub-jke7.onrender.com'
const BASE_URL = rawBaseUrl.replace(/\/+$/, '')

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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
  // Auth (Admin Only)
  login: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    const data = await handleResponse<AuthResponse>(res)
    localStorage.setItem('admin_token', data.access_token)
    return data
  },

  getMe: (): Promise<AdminUser> =>
    fetch(`${BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() },
    }).then((r) => handleResponse<AdminUser>(r)),

  logout: () => {
    localStorage.removeItem('admin_token')
  },

  isAuthenticated: (): boolean => {
    return Boolean(localStorage.getItem('admin_token'))
  },

  // Courses
  getCourses: (scheduleType?: 'weekday' | 'weekend'): Promise<Course[]> => {
    const url = scheduleType
      ? `${BASE_URL}/courses?schedule_type=${encodeURIComponent(scheduleType)}`
      : `${BASE_URL}/courses`
    return fetch(url).then((r) => handleResponse<Course[]>(r))
  },

  createCourse: (data: {
    code: string
    name: string
    schedule_type: 'weekday' | 'weekend'
  }): Promise<Course> =>
    fetch(`${BASE_URL}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Course>(r)),

  getCourseStudents: (courseId: number): Promise<Student[]> =>
    fetch(`${BASE_URL}/courses/${courseId}/students`).then((r) =>
      handleResponse<Student[]>(r)
    ),

  updateCourse: (
    courseId: number,
    data: { code?: string; name?: string; schedule_type?: 'weekday' | 'weekend' }
  ): Promise<Course> =>
    fetch(`${BASE_URL}/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Course>(r)),

  deleteCourse: (courseId: number): Promise<{ message: string }> =>
    fetch(`${BASE_URL}/courses/${courseId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    }).then((r) => handleResponse<{ message: string }>(r)),

  // Students (Create student by class/course)
  getStudents: (courseId?: number): Promise<Student[]> => {
    const url = courseId !== undefined ? `${BASE_URL}/students?course_id=${courseId}` : `${BASE_URL}/students`
    return fetch(url).then((r) => handleResponse<Student[]>(r))
  },

  createStudent: (data: {
    student_code: string
    full_name: string
    course_id?: number | null
  }): Promise<Student> =>
    fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Student>(r)),

  updateStudent: (
    studentId: number,
    data: {
      student_code?: string
      full_name?: string
      course_id?: number | null
    }
  ): Promise<Student> =>
    fetch(`${BASE_URL}/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<Student>(r)),

  deleteStudent: (studentId: number): Promise<{ message: string }> =>
    fetch(`${BASE_URL}/students/${studentId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    }).then((r) => handleResponse<{ message: string }>(r)),

  // Specific Locations (Specific location & Manual mode)
  getLocations: (): Promise<ClassroomLocation[]> =>
    fetch(`${BASE_URL}/locations`).then((r) => handleResponse<ClassroomLocation[]>(r)),

  createLocation: (data: {
    name: string
    latitude: number
    longitude: number
    default_radius_m: number
  }): Promise<ClassroomLocation> =>
    fetch(`${BASE_URL}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<ClassroomLocation>(r)),

  updateLocation: (
    locationId: number,
    data: {
      name?: string
      latitude?: number
      longitude?: number
      default_radius_m?: number
    }
  ): Promise<ClassroomLocation> =>
    fetch(`${BASE_URL}/locations/${locationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<ClassroomLocation>(r)),

  deleteLocation: (locationId: number): Promise<{ message: string }> =>
    fetch(`${BASE_URL}/locations/${locationId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    }).then((r) => handleResponse<{ message: string }>(r)),

  getStudentAttendance: (studentId: number): Promise<StudentAttendanceItem[]> =>
    fetch(`${BASE_URL}/students/${studentId}/attendance`).then((r) =>
      handleResponse<StudentAttendanceItem[]>(r)
    ),

  // Sessions (Admin Protected)
  createSession: (data: SessionCreate): Promise<SessionResponse> =>
    fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<SessionResponse>(r)),

  getSessionQR: (sessionId: number): Promise<SessionQR> =>
    fetch(`${BASE_URL}/sessions/${sessionId}/qr`, {
      headers: { ...getAuthHeader() },
    }).then((r) => handleResponse<SessionQR>(r)),

  getSessionAttendance: (sessionId: number): Promise<SessionAttendanceItem[]> =>
    fetch(`${BASE_URL}/sessions/${sessionId}/attendance`, {
      headers: { ...getAuthHeader() },
    }).then((r) => handleResponse<SessionAttendanceItem[]>(r)),

  // Public Student Attendance Scan
  scanAttendance: (data: AttendanceScan): Promise<ScanResult> =>
    fetch(`${BASE_URL}/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<ScanResult>(r)),
}
