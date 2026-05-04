import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import History from './pages/History.jsx'
import Acuity from './pages/Acuity.jsx'
import Report from './pages/Report.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/acuity" element={<Acuity />} />
        <Route path="/report" element={<Report />} />
      </Route>
    </Routes>
  )
}
