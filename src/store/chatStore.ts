import { create } from 'zustand'
import type { Chat } from '../api/greenApi'

interface ChatState {
  chats: Chat[]
  recentChatIds: string[]
  replaceFromApi: (chats: Chat[]) => void
  addLocalChat: (chat: Chat) => void
  moveChatToTop: (chatId: string) => void
  clearChats: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  recentChatIds: [],
  replaceFromApi: (chats) =>
    set((state) => {
      const remoteIds = new Set(chats.map((chat) => chat.chatId))
      const localChats = state.chats.filter(
        (chat) => chat.source === 'local' && !remoteIds.has(chat.chatId),
      )
      const combined = [...localChats, ...chats]
      const byId = new Map(combined.map((chat) => [chat.chatId, chat]))
      const recentChatIds = state.recentChatIds.filter((chatId) => byId.has(chatId))
      const recentIds = new Set(recentChatIds)
      const recentChats = recentChatIds.flatMap((chatId): Chat[] => {
        const chat = byId.get(chatId)
        return chat === undefined ? [] : [chat]
      })
      return {
        chats: [...recentChats, ...combined.filter((chat) => !recentIds.has(chat.chatId))],
        recentChatIds,
      }
    }),
  addLocalChat: (chat) =>
    set((state) => ({
      chats: state.chats.some((existing) => existing.chatId === chat.chatId)
        ? state.chats
        : [chat, ...state.chats],
    })),
  moveChatToTop: (chatId) =>
    set((state) => {
      const chat = state.chats.find((item) => item.chatId === chatId)
      if (chat === undefined) return state
      return {
        chats: [chat, ...state.chats.filter((item) => item.chatId !== chatId)],
        recentChatIds: [chatId, ...state.recentChatIds.filter((id) => id !== chatId)],
      }
    }),
  clearChats: () => set({ chats: [], recentChatIds: [] }),
}))
