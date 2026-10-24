import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction, SubmitEventHandler } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { checkAccount, getChats } from '../../api/greenApi'
import type { Chat } from '../../api/greenApi'
import { useChatStore } from '../../store/chatStore'
import { useMessageStore } from '../../store/messageStore'
import { useSessionStore } from '../../store/sessionStore'
import { errorMessage, isAbortError } from '../../utils'

type ListStatus = 'loading' | 'ready' | 'error'

interface ChatsController {
  idInstance: string | null
  chats: Chat[]
  listStatus: ListStatus
  isChatOpen: boolean
  isCreating: boolean
  phoneNumber: string
  setPhoneNumber: Dispatch<SetStateAction<string>>
  isChecking: boolean
  createError: string | null
  retryLoad: () => void
  openNewChat: () => void
  cancelNewChat: () => void
  createChat: SubmitEventHandler<HTMLFormElement>
  signOut: () => void
}

export const useChatsController = (): ChatsController => {
  const user = useSessionStore((state) => state.user)
  const clearUser = useSessionStore((state) => state.clearUser)
  const chats = useChatStore((state) => state.chats)
  const replaceFromApi = useChatStore((state) => state.replaceFromApi)
  const addLocalChat = useChatStore((state) => state.addLocalChat)
  const clearChats = useChatStore((state) => state.clearChats)
  const clearMessages = useMessageStore((state) => state.clearMessages)
  const navigate = useNavigate()
  const isChatOpen = useMatch('/chats/:chatId') !== null

  const [listStatus, setListStatus] = useState<ListStatus>('loading')
  const [reloadKey, setReloadKey] = useState<number>(0)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (user === null) return
    const controller = new AbortController()

    const loadChats = async (): Promise<void> => {
      try {
        const loadedChats = await getChats(user, controller.signal)
        if (controller.signal.aborted) return
        replaceFromApi(loadedChats)
        setListStatus('ready')
      } catch (cause: unknown) {
        if (!isAbortError(cause)) setListStatus('error')
      }
    }

    void loadChats()
    return () => controller.abort()
  }, [user, replaceFromApi, reloadKey])

  const retryLoad = (): void => {
    setListStatus('loading')
    setReloadKey((key) => key + 1)
  }

  const openNewChat = (): void => {
    setIsCreating(true)
    setCreateError(null)
  }

  const cancelNewChat = (): void => {
    setIsCreating(false)
    setPhoneNumber('')
    setCreateError(null)
  }

  const createChat: SubmitEventHandler<HTMLFormElement> = (event): void => {
    event.preventDefault()
    if (user === null || isChecking) return

    const normalized = phoneNumber.replace(/[()\s-]/g, '').replace(/^\+/, '')
    if (!/^[1-9]\d{7,14}$/.test(normalized)) {
      setCreateError('Введите номер в международном формате: от 8 до 15 цифр.')
      return
    }

    setIsChecking(true)
    setCreateError(null)

    const verifyAccount = async (): Promise<void> => {
      try {
        const result = await checkAccount(user, normalized)
        if (useSessionStore.getState().user !== user) return
        if (!result.exist) {
          setCreateError('Аккаунт Telegram не найден или номер скрыт настройками приватности.')
          return
        }

        addLocalChat({
          chatId: result.chatId,
          name: result.username || `+${result.phoneNumber}`,
          type: 'user',
          phoneNumber: result.phoneNumber,
          username: result.username,
          source: 'local',
        })
        cancelNewChat()
        void navigate(`/chats/${encodeURIComponent(result.chatId)}`)
      } catch (cause: unknown) {
        if (useSessionStore.getState().user === user) setCreateError(errorMessage(cause))
      } finally {
        if (useSessionStore.getState().user === user) setIsChecking(false)
      }
    }

    void verifyAccount()
  }

  const signOut = (): void => {
    clearMessages()
    clearChats()
    clearUser()
  }

  return {
    idInstance: user?.idInstance ?? null,
    chats,
    listStatus,
    isChatOpen,
    isCreating,
    phoneNumber,
    setPhoneNumber,
    isChecking,
    createError,
    retryLoad,
    openNewChat,
    cancelNewChat,
    createChat,
    signOut,
  }
}
