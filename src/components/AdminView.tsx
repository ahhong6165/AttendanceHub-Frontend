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
} from 'lucide-react'
import { api } from '../api'
import type { Course, SessionAttendanceItem, SessionQR, SessionResponse, Student } from '../types'

export function AdminView() {
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New Course Form
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseName, setNewCourseName] = useState('')

  // New Student Form
  const [newStudentCode, setNewStudentCode] = useState('')
  const [newStudentName, setNewStudentName] = useState('')

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
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [cList, sList] = await Promise.all([api.getCourses(), api.getStudents()])
      setCourses(cList)
      setStudents(sList)
      if (cList.length > 0 && selectedCourseId === '') {
        setSelectedCourseId(cList[0].id)
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load initial data' })
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
        setMessage({ type: 'success', text: `Location acquired (Accuracy: ±${Math.round(pos.coords.accuracy)}m)` })
      },
      (err) => {
        setGeoLocating(false)
        setMessage({ type: 'error', text: `GPS Error: ${err.message}` })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourseCode || !newCourseName) return
    try {
      const created = await api.createCourse({ code: newCourseCode.trim(), name: newCourseName.trim() })
      setCourses((prev) => [...prev, created])
      if (selectedCourseId === '') setSelectedCourseId(created.id)
      setNewCourseCode('')
      setNewCourseName('')
      setMessage({ type: 'success', text: `Course "${created.name}" created!` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentCode || !newStudentName) return
    try {
      const created = await api.createStudent({ student_code: newStudentCode.trim(), full_name: newStudentName.trim() })
      setStudents((prev) => [...prev, created])
      setNewStudentCode('')
      setNewStudentName('')
      setMessage({ type: 'success', text: `Student "${created.full_name}" registered!` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId) {
      setMessage({ type: 'error', text: 'Please select a course first.' })
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

      // Fetch QR Code token
      const qr = await api.getSessionQR(session.id)
      setActiveQR(qr)
      setAttendees([])
      setMessage({ type: 'success', text: `Session #${session.id} opened for ${durationMinutes} mins!` })
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

  return (
    <div className="space-y-8">
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
                Project this QR code on the classroom screen. Students must be within{' '}
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
                HMAC Signed • Expires Automatically
              </span>
            </div>
          </div>

          {/* Live Check-in list */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" /> Live Checked-in Attendees ({attendees.length})
            </h3>
            {attendees.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Waiting for students to scan and check in...</p>
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
        {/* Create Session Form */}
        <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">Start Attendance Session</h3>
          </div>
          <form onSubmit={handleCreateSession} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {courses.length === 0 && <option value="">No courses yet. Create one first!</option>}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
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

        {/* Courses List & Form */}
        <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Courses ({courses.length})</h3>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {courses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No courses registered yet.</p>
              ) : (
                courses.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-indigo-900">{c.code}</span>
                      <p className="text-slate-600 truncate max-w-[180px]">{c.name}</p>
                    </div>
                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-mono text-slate-700">
                      ID: {c.id}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCreateCourse} className="mt-4 border-t border-slate-100 pt-3 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Add New Course</span>
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
                placeholder="Name (e.g. Intro to CS)"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 py-1.5 text-xs font-medium text-white hover:bg-slate-900 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Course
            </button>
          </form>
        </div>

        {/* Students List & Form */}
        <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Students ({students.length})</h3>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {students.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No students registered yet.</p>
              ) : (
                students.map((st) => (
                  <div key={st.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-indigo-900">{st.student_code}</span>
                      <p className="text-slate-600 truncate max-w-[160px]">{st.full_name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewStudentHistory(st)}
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-2 py-1 rounded-md"
                    >
                      <Eye className="h-3 w-3" /> History
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCreateStudent} className="mt-4 border-t border-slate-100 pt-3 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Register New Student</span>
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
                placeholder="Full Name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 py-1.5 text-xs font-medium text-white hover:bg-slate-900 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Register Student
            </button>
          </form>
        </div>
      </div>

      {/* Student History Modal */}
      {viewHistoryStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                Attendance History for {viewHistoryStudent.full_name} ({viewHistoryStudent.student_code})
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
