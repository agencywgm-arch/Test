import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-apple-bg">
        <div className="w-6 h-6 border-2 border-apple-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return children
}
