import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction, SubmitEventHandler } from 'react'
import { ensureNotificationSettings, getInstanceStatus, getQrCode } from '../../api/greenApi'
import type { InstanceUser } from '../../store/sessionStore'
import { useSessionStore } from '../../store/sessionStore'
import { delay, errorMessage, isAbortError } from '../../utils'

type LoginPhase = 'idle' | 'checking' | 'waiting' | 'configuring' | 'error'
const PENDING_PASSWORD_MESSAGE =
  'Для этого аккаунта нужен пароль двухэтапной проверки Telegram. Ввод пароля пока не поддерживается на сайте.'

interface LoginController {
  idInstance: string
  setIdInstance: Dispatch<SetStateAction<string>>
  apiTokenInstance: string
  setApiTokenInstance: Dispatch<SetStateAction<string>>
  phase: LoginPhase
  error: string | null
  qrCode: string | null
  handleSubmit: SubmitEventHandler<HTMLFormElement>
  cancelQr: () => void
}

export const useLoginController = (): LoginController => {
  const [idInstance, setIdInstance] = useState<string>('')
  const [apiTokenInstance, setApiTokenInstance] = useState<string>('')
  const [phase, setPhase] = useState<LoginPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pendingUser, setPendingUser] = useState<InstanceUser | null>(null)
  const pollController = useRef<AbortController | null>(null)
  const setUser = useSessionStore((state) => state.setUser)

  useEffect(() => {
    if (pendingUser === null) return
    const controller = new AbortController()
    pollController.current = controller
    const signal = controller.signal
    const user = pendingUser
    let isCompleting = false

    const fail = (message: string): void => {
      if (signal.aborted) return
      controller.abort()
      setError(message)
      setPhase('error')
      setPendingUser(null)
    }

    const completeLogin = async (): Promise<void> => {
      if (signal.aborted || isCompleting) return
      isCompleting = true
      setPhase('configuring')
      try {
        await ensureNotificationSettings(user, signal)
        if (!signal.aborted) setUser(user)
      } catch (cause: unknown) {
        if (!isAbortError(cause)) fail(errorMessage(cause))
      }
    }

    const pollQr = async (): Promise<void> => {
      try {
        while (!signal.aborted && !isCompleting) {
          const result = await getQrCode(user, signal)
          if (signal.aborted || isCompleting) return
          if (result.type === 'qrCode') {
            setQrCode(result.message)
          } else if (result.type === 'alreadyLogged' || result.type === 'already_registered') {
            if ((await getInstanceStatus(user, signal)) === 'authorized') {
              await completeLogin()
              return
            }
          } else if (result.type === 'error') {
            fail(result.message)
            return
          }
          await delay(5000, signal)
        }
      } catch (cause: unknown) {
        if (!isCompleting && !isAbortError(cause)) fail(errorMessage(cause))
      }
    }

    const pollStatus = async (): Promise<void> => {
      try {
        while (!signal.aborted && !isCompleting) {
          await delay(3000, signal)
          if (signal.aborted || isCompleting) return
          const status = await getInstanceStatus(user, signal)
          if (signal.aborted || isCompleting) return
          if (status === 'authorized') {
            await completeLogin()
            return
          }
          if (status === 'pendingPassword') {
            fail(PENDING_PASSWORD_MESSAGE)
            return
          }
          if (status !== 'notAuthorized' && status !== 'starting') {
            fail('Инстанс сейчас недоступен для авторизации.')
            return
          }
        }
      } catch (cause: unknown) {
        if (!isCompleting && !isAbortError(cause)) fail(errorMessage(cause))
      }
    }

    void pollQr()
    void pollStatus()
    return () => {
      controller.abort()
      if (pollController.current === controller) pollController.current = null
    }
  }, [pendingUser, setUser])

  const connect = async (user: InstanceUser): Promise<void> => {
    try {
      const status = await getInstanceStatus(user)
      if (status === 'authorized') {
        setPhase('configuring')
        await ensureNotificationSettings(user)
        setUser(user)
      } else if (status === 'notAuthorized') {
        setPendingUser(user)
        setPhase('waiting')
      } else {
        setError(
          status === 'pendingPassword'
            ? PENDING_PASSWORD_MESSAGE
            : 'Инстанс сейчас недоступен. Попробуйте позже.',
        )
        setPhase('error')
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause))
      setPhase('error')
    }
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event): void => {
    event.preventDefault()
    if (phase === 'checking' || phase === 'waiting') return
    const user: InstanceUser = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }
    if (!/^\d+$/.test(user.idInstance) || user.apiTokenInstance.length === 0) {
      setError('Введите числовой idInstance и apiTokenInstance.')
      setPhase('error')
      return
    }

    setError(null)
    setQrCode(null)
    setPhase('checking')
    void connect(user)
  }

  const cancelQr = (): void => {
    pollController.current?.abort()
    setPendingUser(null)
    setQrCode(null)
    setPhase('idle')
    setError(null)
  }

  return {
    idInstance,
    setIdInstance,
    apiTokenInstance,
    setApiTokenInstance,
    phase,
    error,
    qrCode,
    handleSubmit,
    cancelQr,
  }
}
