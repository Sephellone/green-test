import type { RouteObject } from 'react-router'
import { LoginPage } from '../pages/Login/LoginPage'
import { ChatsPage } from '../pages/Chats/ChatsPage'
import { ChatPanel } from '../pages/Chats/components/ChatPanel'
import { EmptyChat } from '../pages/Chats/components/EmptyChat'
import { DefaultRedirect, GuestRoute, ProtectedRoute } from './routeGuards'

export const routes: RouteObject[] = [
  {
    Component: GuestRoute,
    children: [{ path: '/login', Component: LoginPage }],
  },
  {
    Component: ProtectedRoute,
    children: [
      {
        path: '/chats',
        Component: ChatsPage,
        children: [
          { index: true, Component: EmptyChat },
          { path: ':chatId', Component: ChatPanel },
        ],
      },
    ],
  },
  { path: '*', Component: DefaultRedirect },
]
