import { useEffect, useState } from 'react'
import { deleteNotification, receiveNotification } from '../../api/greenApi'
import { useChatStore } from '../../store/chatStore'
import { useMessageStore } from '../../store/messageStore'
import { useSessionStore } from '../../store/sessionStore'
import { errorMessage } from '../../utils'

interface NotificationsController {
  error: string | null
  retry: () => void
}

export const useNotificationsController = (chatId: string): NotificationsController => {
  const user = useSessionStore((state) => state.user)
  const addLocalChat = useChatStore((state) => state.addLocalChat)
  const moveChatToTop = useChatStore((state) => state.moveChatToTop)
  const addMessage = useMessageStore((state) => state.addMessage)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState<number>(0)

  useEffect(() => {
    if (user === null) return
    const controller = new AbortController()
    const signal = controller.signal

    const poll = async (): Promise<void> => {
      while (!signal.aborted) {
        try {
          const notification = await receiveNotification(user, signal)
          if (signal.aborted) return

          if (notification !== null) {
            if (notification.message?.chatId === chatId && notification.chat?.type === 'user') {
              addLocalChat(notification.chat)
              addMessage(notification.message)
              moveChatToTop(chatId)
            }
            await deleteNotification(user, notification.receiptId, signal)
          }
        } catch (cause: unknown) {
          if (signal.aborted) return
          setError(errorMessage(cause))
          return
        }
      }
    }

    void poll()
    return () => controller.abort()
  }, [user, chatId, addLocalChat, addMessage, moveChatToTop, retryKey])

  const retry = (): void => {
    setError(null)
    setRetryKey((key) => key + 1)
  }

  return { error, retry }
}
