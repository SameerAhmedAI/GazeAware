import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import History from './pages/History.jsx'
import Acuity from './pages/Acuity.jsx'
import Report from './pages/Report.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('gazeaware_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/acuity" element={<Acuity />} />
        <Route path="/report" element={<Report />} />
      </Route>
    </Routes>
  )
}
