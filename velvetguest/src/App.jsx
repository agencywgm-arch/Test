import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import RestaurantsPage from './pages/RestaurantsPage'
import AuthGuard from './components/AuthGuard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/restaurants" replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/restaurants"
          element={
            <AuthGuard>
              <RestaurantsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/restaurants/:id"
          element={
            <AuthGuard>
              <div className="flex items-center justify-center min-h-screen text-apple-gray text-sm">
                Dashboard restaurant (à venir)
              </div>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
