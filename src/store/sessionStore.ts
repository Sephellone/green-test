import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface InstanceUser {
  idInstance: string
  apiTokenInstance: string
}

interface SessionState {
  user: InstanceUser | null
  setUser: (user: InstanceUser) => void
  clearUser: () => void
}

interface PersistedSession {
  user: InstanceUser | null
}

const isInstanceUser = (value: unknown): value is InstanceUser => {
  if (typeof value !== 'object' || value === null) return false
  const user = value as Record<string, unknown>
  return typeof user.idInstance === 'string' && typeof user.apiTokenInstance === 'string'
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'green-api-session',
      storage: createJSONStorage<PersistedSession>(() => sessionStorage),
      partialize: (state): PersistedSession => ({ user: state.user }),
      merge: (persistedState, currentState): SessionState => {
        if (typeof persistedState !== 'object' || persistedState === null) return currentState
        const user = (persistedState as Record<string, unknown>).user
        return { ...currentState, user: isInstanceUser(user) ? user : null }
      },
    },
  ),
)
