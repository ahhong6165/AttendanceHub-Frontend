import { useEffect, useState } from 'react'
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Compass,
  History,
  Send,
  Camera,
  MapPin,
  Settings2,
} from 'lucide-react'
import { api } from '../api'
import type { ScanResult, Student, StudentAttendanceItem } from '../types'
import { QRScannerModal } from './QRScannerModal'

export function StudentView() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('')
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [isManualGps, setIsManualGps] = useState(false)
  const [manualLat, setManualLat] = useState<number>(13.7563)
  const [manualLng, setManualLng] = useState<number>(100.5018)
  const [geoLoading, setGeoLoading] = useState(false)
  const [qrToken, setQrToken] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<StudentAttendanceItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadStudents()
    acquireLocation()
  }, [])

  const loadStudents = async () => {
    try {
      const list = await api.getStudents()
      setStudents(list)
      if (list.length > 0) setSelectedStudentId(list[0].id)
    } catch {
      // ignore
    }
  }

  const acquireLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Manual GPS mode enabled.')
      setIsManualGps(true)
      return
    }
    setGeoLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const found = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        }
        setCoords(found)
        setManualLat(found.lat)
        setManualLng(found.lng)
        setGeoLoading(false)
      },
      (err) => {
        setGeoLoading(false)
        const isSecureOriginError =
          err.message.toLowerCase().includes('secure origin') ||
          err.message.toLowerCase().includes('insecure') ||
          err.code === 1 // PERMISSION_DENIED
        if (isSecureOriginError) {
          setError(
            'Browser blocked GPS because the connection is not HTTPS or localhost. Switched to Manual GPS mode below so you can proceed without HTTPS.'
          )
        } else {
          setError(`Location Error: ${err.message}. Switched to Manual GPS mode.`)
        }
        setIsManualGps(true)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleScanSuccess = (token: string) => {
    setQrToken(token)
  }

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) {
      setError('Please select your student identity.')
      return
    }

    const currentLat = isManualGps ? manualLat : coords?.lat
    const currentLng = isManualGps ? manualLng : coords?.lng

    if (currentLat === undefined || currentLng === undefined) {
      setError('GPS coordinates required. Please specify coordinates or enable GPS.')
      return
    }
    if (!qrToken.trim()) {
      setError('Please scan or enter the classroom QR token.')
      return
    }

    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.scanAttendance({
        student_id: Number(selectedStudentId),
        qr_token: qrToken.trim(),
        latitude: currentLat,
        longitude: currentLng,
      })
      setResult(res)
      loadHistory(Number(selectedStudentId))
    } catch (err: any) {
      setError(err.message || 'Failed to submit attendance.')
    } finally {
      setSubmitting(false)
    }
  }

  const loadHistory = async (id: number) => {
    setLoadingHistory(true)
    try {
      const list = await api.getStudentAttendance(id)
      setHistory(list)
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (selectedStudentId !== '') {
      loadHistory(Number(selectedStudentId))
    }
  }, [selectedStudentId])

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Student Check-in Card */}
      <div className="rounded-3xl bg-white p-6 md:p-8 shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student Check-In</h2>
            <p className="text-xs text-slate-500">Scan classroom QR and verify your GPS location</p>
          </div>
        </div>

        <form onSubmit={handleSubmitAttendance} className="mt-6 space-y-5">
          {/* 1. Student Identity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Select Your Student Profile
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {students.length === 0 && <option value="">No students found. Register in Lecturer View!</option>}
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.student_code} - {st.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. GPS Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Location Verification {isManualGps && <span className="text-amber-600 lowercase">(manual mode)</span>}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualGps(!isManualGps)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600"
                >
                  <Settings2 className="h-3 w-3" />
                  {isManualGps ? 'Switch to Auto GPS' : 'Enter GPS Manually'}
                </button>
                {!isManualGps && (
                  <button
                    type="button"
                    onClick={acquireLocation}
                    disabled={geoLoading}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    {geoLoading ? 'Acquiring...' : 'Refresh GPS'}
                  </button>
                )}
              </div>
            </div>

            {/* GPS Display or Manual Input */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              {isManualGps ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                      Manual Coordinates (bypasses browser HTTPS restriction):
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Latitude</span>
                      <input
                        type="number"
                        step="any"
                        value={manualLat}
                        onChange={(e) => setManualLat(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Longitude</span>
                      <input
                        type="number"
                        step="any"
                        value={manualLng}
                        onChange={(e) => setManualLng(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ) : coords ? (
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <p className="font-mono text-slate-800">
                      Lat: <span className="font-semibold">{coords.lat}</span>, Lng:{' '}
                      <span className="font-semibold">{coords.lng}</span>
                    </p>
                    {coords.accuracy && (
                      <p className="text-slate-500 text-[11px]">Accuracy: ±{coords.accuracy} meters</p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> GPS Ready
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-amber-700">
                  <span>GPS location not yet acquired.</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={acquireLocation}
                      className="font-semibold underline"
                    >
                      Retry GPS
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setIsManualGps(true)}
                      className="font-semibold underline"
                    >
                      Use Manual Input
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. QR Token */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. Scan or Paste QR Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan with camera or paste token"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition"
              >
                <Camera className="h-4 w-4" /> Scan Camera
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {result && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h4 className="font-bold text-sm">Attendance Marked Successfully!</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-emerald-700 block">Distance to classroom</span>
                  <span className="font-bold">{result.distance_m} metres</span>
                </div>
                <div>
                  <span className="text-emerald-700 block">Timestamp</span>
                  <span className="font-bold">{new Date(result.marked_at).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Check-In Button */}
          <button
            type="submit"
            disabled={submitting || (!coords && !isManualGps) || !qrToken}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Verifying & Submitting...' : 'Mark Attendance Now'}
          </button>
        </form>
      </div>

      {/* Student Attendance History */}
      {selectedStudentId !== '' && (
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Your Attendance History</h3>
          </div>
          {loadingHistory ? (
            <p className="text-xs text-slate-400">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No attendance records found yet.</p>
          ) : (
            <div className="space-y-2.5">
              {history.map((item) => (
                <div
                  key={item.attendance_id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{item.course_name}</span>
                    <p className="text-slate-500 text-[11px]">
                      {item.course_code} • {new Date(item.marked_at).toLocaleDateString()} at{' '}
                      {new Date(item.marked_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-800 text-[11px]">
                    {item.distance_m}m away
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  )
}
