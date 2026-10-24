import { useEffect, useRef, useState } from 'react'
import type {
  Dispatch,
  KeyboardEventHandler,
  RefObject,
  SetStateAction,
  SubmitEventHandler,
} from 'react'
import { getChatHistory, sendTextMessage } from '../../api/greenApi'
import type { TextMessage } from '../../api/greenApi'
import { useChatStore } from '../../store/chatStore'
import { useMessageStore } from '../../store/messageStore'
import { useSessionStore } from '../../store/sessionStore'
import { errorMessage, isAbortError } from '../../utils'
import { useNotificationsController } from './notificationsController'

const EMPTY_MESSAGES: TextMessage[] = []
type HistoryStatus = 'loading' | 'ready' | 'error'

interface ChatPanelController {
  messages: TextMessage[]
  historyStatus: HistoryStatus
  historyError: string | null
  retryHistory: () => void
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
  isSending: boolean
  sendError: string | null
  notificationError: string | null
  retryNotifications: () => void
  messagesRef: RefObject<HTMLDivElement | null>
  handleSend: SubmitEventHandler<HTMLFormElement>
  handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement>
}

export const useChatPanelController = (chatId: string): ChatPanelController => {
  const user = useSessionStore((state) => state.user)
  const messages = useMessageStore((state) => state.messagesByChat[chatId] ?? EMPTY_MESSAGES)
  const addMessage = useMessageStore((state) => state.addMessage)
  const mergeHistory = useMessageStore((state) => state.mergeHistory)
  const moveChatToTop = useChatStore((state) => state.moveChatToTop)
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>('loading')
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyRetryKey, setHistoryRetryKey] = useState<number>(0)
  const [draft, setDraft] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const { error: notificationError, retry: retryNotifications } = useNotificationsController(chatId)

  useEffect(() => {
    if (user === null) return
    const controller = new AbortController()

    const loadHistory = async (): Promise<void> => {
      try {
        const history = await getChatHistory(user, chatId, controller.signal)
        if (controller.signal.aborted || useSessionStore.getState().user !== user) return
        mergeHistory(chatId, history)
        setHistoryStatus('ready')
      } catch (cause: unknown) {
        if (controller.signal.aborted || isAbortError(cause)) return
        setHistoryError(errorMessage(cause))
        setHistoryStatus('error')
      }
    }

    void loadHistory()
    return () => controller.abort()
  }, [user, chatId, mergeHistory, historyRetryKey])

  useEffect(() => {
    const container = messagesRef.current
    if (container !== null) container.scrollTop = container.scrollHeight
  }, [messages])

  const retryHistory = (): void => {
    setHistoryError(null)
    setHistoryStatus('loading')
    setHistoryRetryKey((key) => key + 1)
  }

  const handleSend: SubmitEventHandler<HTMLFormElement> = (event): void => {
    event.preventDefault()
    const text = draft.trim()
    if (user === null || isSending || text.length === 0) return
    if (text.length > 4096) {
      setSendError('Сообщение не может быть длиннее 4096 символов.')
      return
    }

    setIsSending(true)
    setSendError(null)

    const send = async (): Promise<void> => {
      try {
        const idMessage = await sendTextMessage(user, chatId, text)
        if (useSessionStore.getState().user !== user) return
        addMessage({ chatId, idMessage, text, timestamp: Date.now() / 1000, direction: 'outgoing' })
        moveChatToTop(chatId)
        setDraft('')
      } catch (cause: unknown) {
        if (useSessionStore.getState().user === user) setSendError(errorMessage(cause))
      } finally {
        setIsSending(false)
      }
    }

    void send()
  }

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event): void => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return {
    messages,
    historyStatus,
    historyError,
    retryHistory,
    draft,
    setDraft,
    isSending,
    sendError,
    notificationError,
    retryNotifications,
    messagesRef,
    handleSend,
    handleKeyDown,
  }
}
