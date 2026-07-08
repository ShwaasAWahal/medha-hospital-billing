import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import { ErrorState, LoadingState } from './components/PageState.jsx'
import Sidebar from './components/Sidebar.jsx'
import Bills from './pages/Bills.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Employees from './pages/Employee.jsx'
import Login from './pages/Login.jsx'
import NewBill from './pages/NewBill.jsx'
import Patients from './pages/Patients.jsx'
import Reports from './pages/Reports.jsx'
import Services from './pages/Services.jsx'
import Settings from './pages/Settings.jsx'
import { getDashboard, isAuthenticated, logout } from './services/authService.js'
import { getApiErrorMessage } from './services/api.js'

function AppLayout() {
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEmployee = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const dashboard = await getDashboard()
      setEmployee(dashboard.employee)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to verify your session.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEmployee()
  }, [loadEmployee])

  if (isLoading) return <LoadingState message="Verifying session…" />
  if (error) return <ErrorState message={error} onRetry={loadEmployee} />

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <Sidebar employee={employee} />
      <div className="app-content">
        <Navbar employee={employee} onLogout={handleLogout} />
        <main className="page-content">
          <Outlet context={{ employee }} />
        </main>
      </div>
    </div>
  )
}

function ProtectedLayout() {
  return isAuthenticated() ? <AppLayout /> : <Navigate to="/login" replace />
}

function LoginRoute() {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/services" element={<Services />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/bills/new" element={<NewBill />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default AppRoutes

