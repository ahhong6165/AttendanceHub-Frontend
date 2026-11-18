import { useState } from 'react'
import { GraduationCap, Laptop, Smartphone } from 'lucide-react'
import { AdminView } from './components/AdminView'
import { StudentView } from './components/StudentView'

export function App() {
  const [viewMode, setViewMode] = useState<'admin' | 'student'>('admin')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & App Title */}
            <div className="flex items-center gap-3">
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

            {/* Mode Switcher Tabs */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
              <button
                onClick={() => setViewMode('admin')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'admin'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span className="hidden sm:inline">Lecturer / Display</span>
              </button>
              <button
                onClick={() => setViewMode('student')}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {viewMode === 'admin' ? <AdminView /> : <StudentView />}
      </main>
    </div>
  )
}

export default App
