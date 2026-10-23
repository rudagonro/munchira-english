import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import AppHome from './pages/AppHome'
import TeacherPanel from './pages/TeacherPanel'
import Diagnostic from './pages/Diagnostic'
import CycleModules from './pages/CycleModules'
import ModuleView from './pages/ModuleView'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/cycle" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Layout><AppHome /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/diagnostic"
            element={
              <ProtectedRoute>
                <Diagnostic />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cycle"
            element={
              <ProtectedRoute>
                <Layout><CycleModules /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/module/:moduleId"
            element={
              <ProtectedRoute>
                <Layout><ModuleView /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <Layout><TeacherPanel /></Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/cycle" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
