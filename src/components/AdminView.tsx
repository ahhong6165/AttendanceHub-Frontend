import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  BookOpen,
  Users,
  MapPin,
  PlusCircle,
  Copy,
  Check,
  Radio,
  Eye,
  Lock,
  LogOut,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../api'
import type { Course, SessionAttendanceItem, SessionQR, SessionResponse, Student } from '../types'

export function AdminView() {
  // Auth state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(api.isAuthenticated())
  const [adminUsername, setAdminUsername] = useState<string>('')
  const [loginUser, setLoginUser] = useState<string>('admin')
  const [loginPass, setLoginPass] = useState<string>('')
  const [loginLoading, setLoginLoading] = useState<boolean>(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Data state
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState<'all' | 'weekday' | 'weekend'>('all')
  const [selectedStudentClassFilter, setSelectedStudentClassFilter] = useState<number | 'all'>('all')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New Course Form (with weekday vs weekend)
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseSchedule, setNewCourseSchedule] = useState<'weekday' | 'weekend'>('weekday')

  // New Student Form (by class)
  const [newStudentCode, setNewStudentCode] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentCourseId, setNewStudentCourseId] = useState<number | ''>('')

  // Edit Course Modal state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editCourseCode, setEditCourseCode] = useState('')
  const [editCourseName, setEditCourseName] = useState('')
  const [editCourseSchedule, setEditCourseSchedule] = useState<'weekday' | 'weekend'>('weekday')
  const [editCourseSaving, setEditCourseSaving] = useState(false)

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editStudentCode, setEditStudentCode] = useState('')
  const [editStudentName, setEditStudentName] = useState('')
  const [editStudentCourseId, setEditStudentCourseId] = useState<number | ''>('')
  const [editStudentSaving, setEditStudentSaving] = useState(false)

  // Session Form
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('')
  const [latitude, setLatitude] = useState<number>(13.7563)
  const [longitude, setLongitude] = useState<number>(100.5018)
  const [radiusM, setRadiusM] = useState<number>(100)
  const [durationMinutes, setDurationMinutes] = useState<number>(15)
  const [geoLocating, setGeoLocating] = useState(false)

  // Active Session state
  const [activeSession, setActiveSession] = useState<SessionResponse | null>(null)
  const [activeQR, setActiveQR] = useState<SessionQR | null>(null)
  const [attendees, setAttendees] = useState<SessionAttendanceItem[]>([])
  const [copied, setCopied] = useState(false)
  const [viewHistoryStudent, setViewHistoryStudent] = useState<Student | null>(null)
  const [studentHistory, setStudentHistory] = useState<any[]>([])

  useEffect(() => {
    if (api.isAuthenticated()) {
      checkAuthAndLoad()
    }
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      const me = await api.getMe()
      setAdminUsername(me.username)
      setIsAdminLoggedIn(true)
      loadInitialData()
    } catch {
      api.logout()
      setIsAdminLoggedIn(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginUser || !loginPass) {
      setLoginError('Please enter username and password.')
      return
    }
    setLoginLoading(true)
    setLoginError(null)
    try {
      const res = await api.login({ username: loginUser.trim(), password: loginPass })
      setAdminUsername(res.username)
      setIsAdminLoggedIn(true)
      loadInitialData()
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    api.logout()
    setIsAdminLoggedIn(false)
    setAdminUsername('')
  }

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [cList, sList] = await Promise.all([api.getCourses(), api.getStudents()])
      setCourses(cList)
      setStudents(sList)
      if (cList.length > 0) {
        if (selectedCourseId === '') setSelectedCourseId(cList[0].id)
        if (newStudentCourseId === '') setNewStudentCourseId(cList[0].id)
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  // Poll attendees if an active session exists
  useEffect(() => {
    if (!activeSession) return
    const interval = setInterval(async () => {
      try {
        const list = await api.getSessionAttendance(activeSession.id)
        setAttendees(list)
      } catch {
        // silent polling catch
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [activeSession])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' })
      return
    }
    setGeoLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)))
        setLongitude(Number(pos.coords.longitude.toFixed(6)))
        setGeoLocating(false)
        setMessage({ type: 'success', text: `GPS acquired (Accuracy: ±${Math.round(pos.coords.accuracy)}m)` })
      },
      (err) => {
        setGeoLocating(false)
        setMessage({ type: 'error', text: `GPS Error: ${err.message}` })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Create Course (Class)
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourseCode || !newCourseName) return
    try {
      const created = await api.createCourse({
        code: newCourseCode.trim(),
        name: newCourseName.trim(),
        schedule_type: newCourseSchedule,
      })
      setCourses((prev) => [...prev, created])
      if (selectedCourseId === '') setSelectedCourseId(created.id)
      if (newStudentCourseId === '') setNewStudentCourseId(created.id)
      setNewCourseCode('')
      setNewCourseName('')
      setMessage({
        type: 'success',
        text: `Class "${created.code} - ${created.name}" (${created.schedule_type === 'weekday' ? 'Mon-Fri' : 'Weekend'}) created!`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  // Open Edit Course Dialog
  const handleOpenEditCourse = (c: Course) => {
    setEditingCourse(c)
    setEditCourseCode(c.code)
    setEditCourseName(c.name)
    setEditCourseSchedule(c.schedule_type)
  }

  // Save Edit Course
  const handleSaveEditCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return
    setEditCourseSaving(true)
    try {
      const updated = await api.updateCourse(editingCourse.id, {
        code: editCourseCode.trim(),
        name: editCourseName.trim(),
        schedule_type: editCourseSchedule,
      })
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      // Also update student list course codes
      setStudents((prev) =>
        prev.map((s) =>
          s.course_id === updated.id
            ? { ...s, course_code: updated.code, course_name: updated.name, schedule_type: updated.schedule_type }
            : s
        )
      )
      setEditingCourse(null)
      setMessage({ type: 'success', text: `Class "${updated.code}" updated successfully!` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setEditCourseSaving(false)
    }
  }

  // Delete Course
  const handleDeleteCourse = async (courseId: number) => {
    if (!window.confirm('Are you sure you want to delete this class? Students will be unassigned.')) return
    try {
      await api.deleteCourse(courseId)
      setCourses((prev) => prev.filter((c) => c.id !== courseId))
      setStudents((prev) =>
        prev.map((s) => (s.course_id === courseId ? { ...s, course_id: null, course_code: null, course_name: null } : s))
      )
      setEditingCourse(null)
      setMessage({ type: 'success', text: 'Class deleted successfully.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  // Create Student By Class
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentCode || !newStudentName) return
    try {
      const created = await api.createStudent({
        student_code: newStudentCode.trim(),
        full_name: newStudentName.trim(),
        course_id: newStudentCourseId !== '' ? Number(newStudentCourseId) : null,
      })
      setStudents((prev) => [...prev, created])
      setNewStudentCode('')
      setNewStudentName('')
      setMessage({
        type: 'success',
        text: `Student "${created.full_name}" registered in ${created.course_code || 'unassigned'}!`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  // Open Edit Student Dialog
  const handleOpenEditStudent = (st: Student) => {
    setEditingStudent(st)
    setEditStudentCode(st.student_code)
    setEditStudentName(st.full_name)
    setEditStudentCourseId(st.course_id ?? '')
  }

  // Save Edit Student
  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    setEditStudentSaving(true)
    try {
      const updated = await api.updateStudent(editingStudent.id, {
        student_code: editStudentCode.trim(),
        full_name: editStudentName.trim(),
        course_id: editStudentCourseId !== '' ? Number(editStudentCourseId) : null,
      })
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      setEditingStudent(null)
      setMessage({ type: 'success', text: `Student "${updated.full_name}" updated successfully!` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setEditStudentSaving(false)
    }
  }

  // Delete Student
  const handleDeleteStudent = async (studentId: number) => {
    if (!window.confirm('Are you sure you want to delete this student and their attendance history?')) return
    try {
      await api.deleteStudent(studentId)
      setStudents((prev) => prev.filter((s) => s.id !== studentId))
      setEditingStudent(null)
      setMessage({ type: 'success', text: 'Student deleted successfully.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  // Create Attendance Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId) {
      setMessage({ type: 'error', text: 'Please select a course/class first.' })
      return
    }
    try {
      setLoading(true)
      const session = await api.createSession({
        course_id: Number(selectedCourseId),
        latitude,
        longitude,
        radius_m: radiusM,
        duration_minutes: durationMinutes,
      })
      setActiveSession(session)

      const qr = await api.getSessionQR(session.id)
      setActiveQR(qr)
      setAttendees([])
      setMessage({ type: 'success', text: `Session #${session.id} started for ${durationMinutes} mins!` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyQR = () => {
    if (!activeQR) return
    navigator.clipboard.writeText(activeQR.qr_token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleViewStudentHistory = async (st: Student) => {
    setViewHistoryStudent(st)
    try {
      const history = await api.getStudentAttendance(st.id)
      setStudentHistory(history)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  // If NOT logged in as admin, show Admin Login Card
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-12">
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-200/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-5">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Admin Authentication</h2>
          <p className="text-xs text-slate-500 mt-1">
            Admin access is required to create classes, register students, and open attendance sessions.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="admin"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Default credentials: <span className="font-mono text-slate-600">admin</span> /{' '}
                <span className="font-mono text-slate-600">admin123</span>
              </p>
            </div>

            {loginError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loginLoading ? 'Signing in...' : 'Sign In as Admin'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Filtered views
  const filteredCourses =
    selectedScheduleFilter === 'all'
      ? courses
      : courses.filter((c) => c.schedule_type === selectedScheduleFilter)

  const filteredStudents =
    selectedStudentClassFilter === 'all'
      ? students
      : students.filter((s) => s.course_id === Number(selectedStudentClassFilter))

  return (
    <div className="space-y-8">
      {/* Admin Status & Logout Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 p-4">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-indigo-950">
            Authenticated as Admin: <span className="font-bold">{adminUsername || 'admin'}</span>
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-600 border border-rose-200 shadow-2xs hover:bg-rose-50 transition"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium transition ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* Live Active Session QR Presentation */}
      {activeSession && activeQR && (
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-4 max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                Session #{activeSession.id} is Live
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Scan to Mark Attendance
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Project this QR code on classroom display. Students must be within{' '}
                <span className="font-bold text-white">{activeSession.radius_m}m</span> of GPS coordinates (
                {latitude.toFixed(4)}, {longitude.toFixed(4)}).
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <span className="text-slate-400 block mb-1">Closes at</span>
                  <span className="font-semibold">{new Date(activeSession.ends_at).toLocaleTimeString()}</span>
                </div>
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <span className="text-slate-400 block mb-1">Total Checked-In</span>
                  <span className="font-semibold text-emerald-300">{attendees.length} Students</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCopyQR}
                  className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/25 transition backdrop-blur-xs"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'QR Token Copied!' : 'Copy QR Token String'}
                </button>
              </div>
            </div>

            {/* QR Code Presentation Box */}
            <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-xl text-slate-900">
              <div className="p-2 border-4 border-indigo-500/30 rounded-xl bg-white">
                <QRCodeSVG value={activeQR.qr_token} size={230} level="H" includeMargin={true} />
              </div>
              <span className="mt-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                HMAC Signed • Expiring Token
              </span>
            </div>
          </div>

          {/* Live Check-in list */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" /> Live Checked-in Attendees ({attendees.length})
            </h3>
            {attendees.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Waiting for students to check in...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {attendees.map((att) => (
                  <div key={att.attendance_id} className="rounded-xl bg-white/10 p-3 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{att.full_name}</p>
                      <p className="text-slate-400">{att.student_code}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded-md bg-emerald-500/20 px-2 py-0.5 font-medium text-emerald-300">
                        {att.distance_m}m away
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(att.marked_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel 1: Start Attendance Session */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">Start Attendance Session</h3>
          </div>
          <form onSubmit={handleCreateSession} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Class / Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {courses.length === 0 && <option value="">No classes found. Create one first!</option>}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name} ({c.schedule_type === 'weekday' ? 'Mon-Fri' : 'Weekend'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">Classroom GPS Location</label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={geoLocating}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {geoLocating ? 'Acquiring...' : 'Use My GPS'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Latitude</span>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Longitude</span>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Radius (m)</label>
                <input
                  type="number"
                  min={10}
                  max={2000}
                  value={radiusM}
                  onChange={(e) => setRadiusM(parseInt(e.target.value) || 100)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (mins)</label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 15)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || courses.length === 0}
              className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
            >
              Generate QR & Launch Session
            </button>
          </form>
        </div>

        {/* Panel 2: Classes / Courses Management (Monday-Friday or Weekend) */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Classes ({courses.length})</h3>
              </div>
            </div>

            {/* Schedule Filter Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 mb-3 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSelectedScheduleFilter('all')}
                className={`flex-1 rounded-md py-1 transition ${
                  selectedScheduleFilter === 'all' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedScheduleFilter('weekday')}
                className={`flex-1 rounded-md py-1 transition ${
                  selectedScheduleFilter === 'weekday' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Mon - Fri
              </button>
              <button
                type="button"
                onClick={() => setSelectedScheduleFilter('weekend')}
                className={`flex-1 rounded-md py-1 transition ${
                  selectedScheduleFilter === 'weekend' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Weekend
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {filteredCourses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No classes found in this schedule.</p>
              ) : (
                filteredCourses.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{c.code}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            c.schedule_type === 'weekday'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {c.schedule_type === 'weekday' ? 'Mon-Fri' : 'Weekend'}
                        </span>
                      </div>
                      <p className="text-slate-600 truncate max-w-[140px] mt-0.5">{c.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCourse(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 transition"
                        title="Edit Class"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">#{c.id}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create Class Form */}
          <form onSubmit={handleCreateCourse} className="mt-4 border-t border-slate-100 pt-3 space-y-2.5">
            <span className="text-xs font-semibold text-slate-800 block">Create New Class</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Code (e.g. CS101)"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                className="col-span-1 rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Class Name"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Schedule Type Selection Radio */}
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Class Schedule:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label
                  className={`flex items-center gap-1.5 rounded-lg border p-2 cursor-pointer transition ${
                    newCourseSchedule === 'weekday'
                      ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="schedule_type"
                    value="weekday"
                    checked={newCourseSchedule === 'weekday'}
                    onChange={() => setNewCourseSchedule('weekday')}
                    className="text-indigo-600"
                  />
                  <span>Monday - Friday</span>
                </label>
                <label
                  className={`flex items-center gap-1.5 rounded-lg border p-2 cursor-pointer transition ${
                    newCourseSchedule === 'weekend'
                      ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="schedule_type"
                    value="weekend"
                    checked={newCourseSchedule === 'weekend'}
                    onChange={() => setNewCourseSchedule('weekend')}
                    className="text-indigo-600"
                  />
                  <span>Weekend</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Class
            </button>
          </form>
        </div>

        {/* Panel 3: Create Student By Class */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Students ({students.length})</h3>
              </div>
            </div>

            {/* Filter by Class */}
            <div className="mb-3">
              <select
                value={selectedStudentClassFilter}
                onChange={(e) =>
                  setSelectedStudentClassFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="all">Filter: Show All Classes</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Filter by: {c.code} ({c.schedule_type === 'weekday' ? 'Mon-Fri' : 'Weekend'})
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No students found for this class.</p>
              ) : (
                filteredStudents.map((st) => (
                  <div key={st.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{st.student_code}</span>
                        {st.course_code && (
                          <span className="rounded-md bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-700 font-medium">
                            {st.course_code}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 truncate max-w-[120px]">{st.full_name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditStudent(st)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 transition"
                        title="Edit Student"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewStudentHistory(st)}
                        className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-2 py-1 rounded-md"
                      >
                        <Eye className="h-3 w-3" /> History
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create Student Form Assigned to Class */}
          <form onSubmit={handleCreateStudent} className="mt-4 border-t border-slate-100 pt-3 space-y-2">
            <span className="text-xs font-semibold text-slate-800 block">Register Student By Class</span>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Assign to Class:</label>
              <select
                value={newStudentCourseId}
                onChange={(e) => setNewStudentCourseId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- No Class (Unassigned) --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name} ({c.schedule_type === 'weekday' ? 'Mon-Fri' : 'Weekend'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Code (STU001)"
                value={newStudentCode}
                onChange={(e) => setNewStudentCode(e.target.value)}
                className="col-span-1 rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Student Name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Register Student
            </button>
          </form>
        </div>
      </div>

      {/* Edit Course Dialog */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Edit Class ({editingCourse.code})</h3>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCourse} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Code</label>
                <input
                  type="text"
                  value={editCourseCode}
                  onChange={(e) => setEditCourseCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Name</label>
                <input
                  type="text"
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-1.5 rounded-lg border p-2 cursor-pointer transition ${
                      editCourseSchedule === 'weekday'
                        ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit_schedule_type"
                      value="weekday"
                      checked={editCourseSchedule === 'weekday'}
                      onChange={() => setEditCourseSchedule('weekday')}
                      className="text-indigo-600"
                    />
                    <span>Monday - Friday</span>
                  </label>
                  <label
                    className={`flex items-center gap-1.5 rounded-lg border p-2 cursor-pointer transition ${
                      editCourseSchedule === 'weekend'
                        ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit_schedule_type"
                      value="weekend"
                      checked={editCourseSchedule === 'weekend'}
                      onChange={() => setEditCourseSchedule('weekend')}
                      className="text-indigo-600"
                    />
                    <span>Weekend</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteCourse(editingCourse.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Class
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCourse(null)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editCourseSaving}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {editCourseSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Dialog */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Edit Student ({editingStudent.student_code})</h3>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Code</label>
                <input
                  type="text"
                  value={editStudentCode}
                  onChange={(e) => setEditStudentCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Class</label>
                <select
                  value={editStudentCourseId}
                  onChange={(e) =>
                    setEditStudentCourseId(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- No Class (Unassigned) --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} ({c.schedule_type === 'weekday' ? 'Mon-Fri' : 'Weekend'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteStudent(editingStudent.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Student
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editStudentSaving}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {editStudentSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student History Modal */}
      {viewHistoryStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                Attendance History: {viewHistoryStudent.full_name} ({viewHistoryStudent.student_code})
              </h3>
              <button
                onClick={() => setViewHistoryStudent(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2 text-xs">
              {studentHistory.length === 0 ? (
                <p className="text-slate-400 italic">No attendance records found for this student.</p>
              ) : (
                studentHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-800">{h.course_name} ({h.course_code})</p>
                      <p className="text-slate-500 text-[11px]">Session #{h.session_id} • Marked: {new Date(h.marked_at).toLocaleString()}</p>
                    </div>
                    <span className="rounded-md bg-emerald-100 px-2 py-1 font-medium text-emerald-800">
                      {h.distance_m}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
