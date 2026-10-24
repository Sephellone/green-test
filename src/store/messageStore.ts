import { create } from 'zustand'
import type { TextMessage } from '../api/greenApi'

interface MessageState {
  messagesByChat: Record<string, TextMessage[]>
  addMessage: (message: TextMessage) => void
  mergeHistory: (chatId: string, messages: TextMessage[]) => void
  clearMessages: () => void
}

export const useMessageStore = create<MessageState>((set) => ({
  messagesByChat: {},
  addMessage: (message) =>
    set((state) => {
      const messages = state.messagesByChat[message.chatId] ?? []
      if (messages.some((item) => item.idMessage === message.idMessage)) return state
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [message.chatId]: [...messages, message].sort((a, b) => a.timestamp - b.timestamp),
        },
      }
    }),
  mergeHistory: (chatId, messages) =>
    set((state) => {
      const current = state.messagesByChat[chatId] ?? []
      const byId = new Map([...messages, ...current].map((message) => [message.idMessage, message]))
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: [...byId.values()].sort((a, b) => a.timestamp - b.timestamp),
        },
      }
    }),
  clearMessages: () => set({ messagesByChat: {} }),
}))
