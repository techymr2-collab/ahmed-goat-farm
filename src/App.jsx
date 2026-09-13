import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import { Skeleton } from './components/Skeleton'

// Pages load on demand so the first screen doesn't download every chart library.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Goats = lazy(() => import('./pages/Goats'))
const GoatDetail = lazy(() => import('./pages/GoatDetail'))
const Health = lazy(() => import('./pages/Health'))
const Breeding = lazy(() => import('./pages/Breeding'))
const Weight = lazy(() => import('./pages/Weight'))
const Milk = lazy(() => import('./pages/Milk'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Sales = lazy(() => import('./pages/Sales'))
const Reports = lazy(() => import('./pages/Reports'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}

const page = (Component) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={page(Dashboard)} />
              <Route path="/goats" element={page(Goats)} />
              <Route path="/goats/:id" element={page(GoatDetail)} />
              <Route path="/health" element={page(Health)} />
              <Route path="/breeding" element={page(Breeding)} />
              <Route path="/weight" element={page(Weight)} />
              <Route path="/milk" element={page(Milk)} />
              <Route path="/expenses" element={page(Expenses)} />
              <Route path="/sales" element={page(Sales)} />
              <Route path="/reports" element={page(Reports)} />
              <Route path="/profile" element={page(Profile)} />
              <Route path="*" element={page(NotFound)} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
