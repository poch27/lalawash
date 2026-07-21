import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ToastProvider } from './components/Toast'
import Login from './pages/Login'
import Search from './pages/Search'
import CustomerDetail from './pages/CustomerDetail'
import NewCustomer from './pages/NewCustomer'
import CustomerView from './pages/CustomerView'
import Layout from './components/Layout'

const Summary = lazy(() => import('./pages/Summary'))

function LazyFallback() {
  return <div className="app-body text-center">Loading...</div>
}

function ProtectedRoute({ children, requireSummaryAccess = false }) {
  const { isStaff, canViewSummary } = useAuth()

  if (!isStaff) return <Navigate to="/login" replace />
  if (requireSummaryAccess && !canViewSummary) return <Navigate to="/" replace />

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/w/:token" element={<CustomerView />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Search />} />
        <Route path="customer/:id" element={<CustomerDetail />} />
        <Route path="new" element={<NewCustomer />} />
        <Route
          path="summary"
          element={
            <ProtectedRoute requireSummaryAccess>
              <Suspense fallback={<LazyFallback />}>
              <Summary />
            </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
