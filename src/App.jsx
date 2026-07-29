import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Goats from './pages/Goats'
import GoatDetail from './pages/GoatDetail'
import Health from './pages/Health'
import Breeding from './pages/Breeding'
import Weight from './pages/Weight'
import Expenses from './pages/Expenses'
import Sales from './pages/Sales'
import Profile from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/goats" element={<Goats />} />
            <Route path="/goats/:id" element={<GoatDetail />} />
            <Route path="/health" element={<Health />} />
            <Route path="/breeding" element={<Breeding />} />
            <Route path="/weight" element={<Weight />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
