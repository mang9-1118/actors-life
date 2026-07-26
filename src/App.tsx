import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/features/Dashboard'
import { TrainingTabPage } from '@/features/TrainingTabPage'
import { MediaLog } from '@/features/MediaLog'
import { ReadingLog } from '@/features/ReadingLog'
import { Auditions } from '@/features/Auditions'
import { AuditionCalendarPage } from '@/features/AuditionCalendar'
import { ClassNotes } from '@/features/ClassNotes'
import { WeeklyAnalysis } from '@/features/WeeklyAnalysis'
import { Settings } from '@/features/Settings'

function Layout() {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="train/:tabPath" element={<TrainingTabPage />} />
          <Route path="media-log" element={<MediaLog />} />
          <Route path="reading-log" element={<ReadingLog />} />
          <Route path="auditions" element={<Auditions />} />
          <Route path="calendar" element={<AuditionCalendarPage />} />
          <Route path="class-notes" element={<ClassNotes />} />
          <Route path="weekly" element={<WeeklyAnalysis />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
