import { useEffect, useState } from 'react'
import {
  Users,
  BookOpen,
  ShieldAlert,
  Server,
  Download,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { api } from '../api'
import type { Course, Student } from '../types'

/**
 * Advanced Management Dashboard (In Development)
 * NOTE: Designed to be modular and easy to remove or toggle off.
 */
export function AdvancedDashboard({ onNavigate }: { onNavigate?: (view: 'admin' | 'student') => void }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [cList, sList] = await Promise.all([api.getCourses(), api.getStudents()])
      setCourses(cList)
      setStudents(sList)
      setApiOnline(true)
    } catch {
      setApiOnline(false)
    } finally {
      setLoading(false)
    }
  }

  // Analytics calculations
  const totalStudents = students.length
  const totalClasses = courses.length
  const weekdayClasses = courses.filter((c) => c.schedule_type === 'weekday').length
  const weekendClasses = courses.filter((c) => c.schedule_type === 'weekend').length
  const assignedStudents = students.filter((s) => s.course_id !== null && s.course_id !== undefined).length
  const unassignedStudents = totalStudents - assignedStudents

  // Export JSON utility
  const exportData = (filename: string, data: object) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', jsonString)
    downloadAnchor.setAttribute('download', filename)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Dev / Beta Banner (highlights that this is in development and easy to remove) */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-xs text-amber-900 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-200/80 px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] text-amber-900">
              In Development
            </span>
            <span className="font-semibold">
              Advanced Management & Cohort Analytics Dashboard
            </span>
          </div>
          <span className="text-[11px] text-amber-700 italic">
            Experimental module • Can be toggled or removed anytime
          </span>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Students
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{loading ? '...' : totalStudents}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              <span className="font-semibold text-indigo-600">{assignedStudents}</span> in classes •{' '}
              <span className="text-amber-600 font-medium">{unassignedStudents} unassigned</span>
            </p>
          </div>
        </div>

        {/* Total Classes */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Classes
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{loading ? '...' : totalClasses}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              <span className="font-semibold text-blue-600">{weekdayClasses} Mon-Fri</span> •{' '}
              <span className="font-semibold text-purple-600">{weekendClasses} Weekend</span>
            </p>
          </div>
        </div>

        {/* System Health */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Backend Status
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900">
                {apiOnline ? 'Online & Healthy' : 'Connecting...'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">FastAPI + SQLite / PostgreSQL</p>
          </div>
        </div>

        {/* Security Profile */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Security Profile
            </span>
            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-bold text-slate-900">HMAC-SHA256</h3>
            <p className="text-[11px] text-slate-500 mt-1">GPS Haversine • Expiring Tokens</p>
          </div>
        </div>
      </div>

      {/* Cohort Breakdown & Class Roster Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Overview Cards */}
        <div className="lg:col-span-2 rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Class Cohorts & Distribution</h3>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('admin')}
                className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-800"
              >
                Go to Lecturer Controls <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {courses.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No classes available yet.</p>
            ) : (
              courses.map((c) => {
                const classStudentCount = students.filter((s) => s.course_id === c.id).length
                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{c.code}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            c.schedule_type === 'weekday'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {c.schedule_type === 'weekday' ? 'Monday - Friday' : 'Weekend'}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{c.name}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-indigo-600">
                          {classStudentCount}
                        </span>
                        <span className="text-slate-400 text-[11px] block">Students Enrolled</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Advanced Tools & Export Data */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Server className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Data Export & Backup</h3>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Export system rosters and records as JSON for backups or external student information systems (SIS).
            </p>

            <div className="mt-5 space-y-3">
              <button
                onClick={() => exportData('students_roster.json', students)}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition"
              >
                <span>Export Students List</span>
                <Download className="h-4 w-4 text-slate-500" />
              </button>

              <button
                onClick={() => exportData('classes_list.json', courses)}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition"
              >
                <span>Export Classes List</span>
                <Download className="h-4 w-4 text-slate-500" />
              </button>

              <button
                onClick={() =>
                  exportData('attendancehub_snapshot.json', {
                    exported_at: new Date().toISOString(),
                    courses,
                    students,
                  })
                }
                className="w-full flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 transition"
              >
                <span>Full System Snapshot</span>
                <Download className="h-4 w-4 text-indigo-600" />
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 block mb-0.5">Quick Removal Guide</span>
              To disable this dashboard module, simply toggle <code className="text-indigo-600 font-mono">ENABLE_ADVANCED_DASHBOARD = false</code> in <code className="text-indigo-600 font-mono">App.tsx</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
