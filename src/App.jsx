import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import AppHome from './pages/AppHome'
import TeacherPanel from './pages/TeacherPanel'
import Diagnostic from './pages/Diagnostic'
import CycleModules from './pages/CycleModules'
import ModuleView from './pages/ModuleView'
import Review from './pages/Review'
import { Privacy, Terms } from './pages/Legal'
import ReviewerMode from './pages/ReviewerMode'
import AdminUsers from './pages/AdminUsers'

function AppRoutes() {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route path="/" element={<Navigate to="/cycle" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacidad" element={<Privacy />} />
        <Route path="/terminos" element={<Terms />} />

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
          path="/review"
          element={
            <ProtectedRoute>
              <Layout><Review /></Layout>
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

        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminUsers /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/revisor"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <Layout><ReviewerMode /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/revisor/modulo/:moduleId"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <Layout><ModuleView preview /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/revisor/diagnostico"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <Diagnostic preview />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/cycle" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
