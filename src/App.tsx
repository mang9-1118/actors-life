import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/app/Layout'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { TrainingTabPage } from '@/features/trainingTimer/TrainingTabPage'
import { MediaLog } from '@/features/mediaLog/MediaLog'
import { ReadingLog } from '@/features/readingLog/ReadingLog'
import { Auditions } from '@/features/auditions/Auditions'
import { AuditionCalendarPage } from '@/features/auditions/AuditionCalendarPage'
import { ClassNotes } from '@/features/classNotes/ClassNotes'
import { WeeklyAnalysis } from '@/features/weeklyAnalysis/WeeklyAnalysis'
import { Settings } from '@/features/settings/Settings'

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
