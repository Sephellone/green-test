import type { ReactElement } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useSessionStore } from '../store/sessionStore'

export const GuestRoute = (): ReactElement => {
  const user = useSessionStore((state) => state.user)
  return user ? <Navigate to="/chats" replace /> : <Outlet />
}

export const ProtectedRoute = (): ReactElement => {
  const user = useSessionStore((state) => state.user)
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export const DefaultRedirect = (): ReactElement => {
  const user = useSessionStore((state) => state.user)
  return <Navigate to={user ? '/chats' : '/login'} replace />
}
