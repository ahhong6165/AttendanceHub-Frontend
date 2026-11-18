import { useEffect, useState } from 'react'
import { GraduationCap, Laptop, Smartphone, LayoutDashboard } from 'lucide-react'
import { AdminView } from './components/AdminView'
import { StudentView } from './components/StudentView'
import { AdvancedDashboard } from './components/AdvancedDashboard'

/**
 * FEATURE TOGGLE:
 * Set to `false` (or remove) whenever you want to completely disable or remove
 * the Advanced Management Dashboard from navigation and routes.
 */
export const ENABLE_ADVANCED_DASHBOARD = true

export type ViewMode = 'admin' | 'student' | 'dashboard'

export function App() {
  // Parse initial view from URL hash, default is always 'admin'
  const getViewFromHash = (): ViewMode => {
    const hash = window.location.hash.toLowerCase()
    if (ENABLE_ADVANCED_DASHBOARD && hash === '#/dashboard') return 'dashboard'
    if (hash === '#/student') return 'student'
    return 'admin' // Default view is admin
  }

  const [viewMode, setViewMode] = useState<ViewMode>(getViewFromHash)

  // Sync state when URL hash changes (e.g. browser back/forward or external link)
  useEffect(() => {
    const handleHashChange = () => {
      setViewMode(getViewFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Change view and update URL hash
  const navigateTo = (view: ViewMode) => {
    setViewMode(view)
    if (view === 'admin') {
      window.location.hash = '#/admin'
    } else if (view === 'student') {
      window.location.hash = '#/student'
    } else if (view === 'dashboard' && ENABLE_ADVANCED_DASHBOARD) {
      window.location.hash = '#/dashboard'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & App Title */}
            <div
              onClick={() => navigateTo('admin')}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  AttendanceHub
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  GPS & Signed QR Code Attendance
                </p>
              </div>
            </div>

            {/* Navigation Tabs (with URL hash sync) */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
              {/* Lecturer / Admin View (Default) */}
              <button
                onClick={() => navigateTo('admin')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'admin'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span>Lecturer / Display</span>
              </button>

              {/* Advanced Dashboard (In Development - easily removable) */}
              {ENABLE_ADVANCED_DASHBOARD && (
                <button
                  onClick={() => navigateTo('dashboard')}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    viewMode === 'dashboard'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="flex items-center gap-1">
                    Dashboard
                    <span className="rounded bg-amber-100 text-amber-800 text-[9px] font-bold px-1 py-0.2">
                      Dev
                    </span>
                  </span>
                </button>
              )}

              {/* Student Check-In View */}
              <button
                onClick={() => navigateTo('student')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'student'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span>Student Check-In</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {viewMode === 'admin' && <AdminView />}
        {viewMode === 'dashboard' && ENABLE_ADVANCED_DASHBOARD && (
          <AdvancedDashboard onNavigate={navigateTo} />
        )}
        {viewMode === 'student' && <StudentView />}
      </main>
    </div>
  )
}

export default App
