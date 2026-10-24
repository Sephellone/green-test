import type { InstanceUser } from '../store/sessionStore'

const API_URL = 'https://api.green-api.com'

const errorTexts = {
  QR_CODE_ERROR_MESSAGE:
    'Не удалось получить QR-код. Проверьте состояние инстанса и повторите попытку.',
  UNREADABLE_NOTIFICATION_MESSAGE:
    'Не удалось прочитать новое сообщение. Получение сообщений приостановлено. Проверьте переписку в Telegram и повторите попытку позже.',
  UNKNOWN_INSTANCE_STATUS: 'Не удалось определить состояние инстанса.',
  CHECK_NUMBER: 'Не удалось проверить номер.',
}

export type InstanceStatus =
  'authorized' | 'notAuthorized' | 'starting' | 'blocked' | 'suspended' | 'pendingPassword'

type NotificationFlag = 'yes' | 'no'

export interface InstanceNotificationSettings {
  webhookUrl: string
  incomingWebhook: NotificationFlag
  outgoingMessageWebhook: NotificationFlag
  outgoingAPIMessageWebhook: NotificationFlag
}

export type QrResponse =
  | { type: 'qrCode'; message: string }
  | { type: 'error' | 'alreadyLogged' | 'already_registered'; message: string }

export type ChatKind = 'user' | 'bot' | 'group' | 'supergroup' | 'channel'

export interface Chat {
  chatId: string
  name: string
  type: ChatKind
  phoneNumber: string | null
  username: string
  source: 'api' | 'local'
}

export interface TextMessage {
  chatId: string
  idMessage: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

export interface ReceivedNotification {
  receiptId: number
  message: TextMessage | null
  chat: Chat | null
}

export type CheckAccountResult =
  { exist: false } | { exist: true; chatId: string; username: string; phoneNumber: string }

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const instanceUrl = (user: InstanceUser, method: string, pathAfterToken?: string): string => {
  const baseUrl = `${API_URL}/waInstance${encodeURIComponent(user.idInstance)}/${method}/${encodeURIComponent(user.apiTokenInstance)}`
  return pathAfterToken === undefined ? baseUrl : `${baseUrl}/${encodeURIComponent(pathAfterToken)}`
}

const requestJson = async (
  user: InstanceUser,
  method: string,
  signal?: AbortSignal,
  body?: Record<string, unknown>,
  httpMethod?: 'DELETE',
  pathAfterToken?: string,
): Promise<unknown> => {
  let response: Response
  try {
    response = await fetch(instanceUrl(user, method, pathAfterToken), {
      signal,
      cache: 'no-store',
      ...(httpMethod === undefined ? {} : { method: httpMethod }),
      ...(body === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Ошибка подключения к GREEN-API.', { cause: error })
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new Error('Неверный idInstance или apiTokenInstance.')
    if (response.status === 466) throw new Error('Достигнут лимит чатов.')
    if (response.status === 469) throw new Error('Telegram ограничил проверку номеров.')
    throw new Error(`Ошибка GREEN-API: ${response.status}.`)
  }
  return response.json() as Promise<unknown>
}

export const getInstanceStatus = async (
  user: InstanceUser,
  signal?: AbortSignal,
): Promise<InstanceStatus> => {
  const data = await requestJson(user, 'getStateInstance', signal)
  if (!isRecord(data) || typeof data.stateInstance !== 'string') {
    throw new Error(errorTexts.UNKNOWN_INSTANCE_STATUS)
  }
  switch (data.stateInstance) {
    case 'authorized':
    case 'notAuthorized':
    case 'starting':
    case 'blocked':
    case 'suspended':
    case 'pendingPassword':
      return data.stateInstance
    default:
      throw new Error(errorTexts.UNKNOWN_INSTANCE_STATUS)
  }
}

const isNotificationFlag = (value: unknown): value is NotificationFlag => {
  return value === 'yes' || value === 'no'
}

export const getInstanceSettings = async (
  user: InstanceUser,
  signal?: AbortSignal,
): Promise<InstanceNotificationSettings> => {
  const data = await requestJson(user, 'getSettings', signal)
  if (!isRecord(data) || data.typeInstance !== 'telegram') {
    throw new Error('Не удалось подтвердить, что инстанс GREEN-API подключён к Telegram.')
  }
  if (
    typeof data.webhookUrl !== 'string' ||
    !isNotificationFlag(data.incomingWebhook) ||
    !isNotificationFlag(data.outgoingMessageWebhook) ||
    !isNotificationFlag(data.outgoingAPIMessageWebhook)
  ) {
    throw new Error('Не удалось прочитать настройки инстанса.')
  }
  return {
    webhookUrl: data.webhookUrl,
    incomingWebhook: data.incomingWebhook,
    outgoingMessageWebhook: data.outgoingMessageWebhook,
    outgoingAPIMessageWebhook: data.outgoingAPIMessageWebhook,
  }
}

export const setInstanceSettings = async (
  user: InstanceUser,
  changes: Partial<InstanceNotificationSettings>,
  signal?: AbortSignal,
): Promise<void> => {
  const data = await requestJson(user, 'setSettings', signal, { ...changes })
  if (!isRecord(data) || data.saveSettings !== true) {
    throw new Error('Ошибка сохранения настроек.')
  }
}

export const ensureNotificationSettings = async (
  user: InstanceUser,
  signal?: AbortSignal,
): Promise<void> => {
  const settings = await getInstanceSettings(user, signal)
  const changes: Partial<InstanceNotificationSettings> = {}
  if (settings.webhookUrl !== '') changes.webhookUrl = ''
  if (settings.incomingWebhook !== 'yes') changes.incomingWebhook = 'yes'
  if (settings.outgoingMessageWebhook !== 'yes') changes.outgoingMessageWebhook = 'yes'
  if (settings.outgoingAPIMessageWebhook !== 'yes') changes.outgoingAPIMessageWebhook = 'yes'
  if (Object.keys(changes).length > 0) await setInstanceSettings(user, changes, signal)
}

export const getQrCode = async (user: InstanceUser, signal?: AbortSignal): Promise<QrResponse> => {
  const data = await requestJson(user, 'qr', signal)
  if (!isRecord(data) || typeof data.type !== 'string' || typeof data.message !== 'string') {
    return { type: 'error', message: errorTexts.QR_CODE_ERROR_MESSAGE }
  }
  switch (data.type) {
    case 'qrCode':
    case 'alreadyLogged':
    case 'already_registered':
      return { type: data.type, message: data.message }
    case 'error':
    default:
      return { type: 'error', message: errorTexts.QR_CODE_ERROR_MESSAGE }
  }
}

const isChatKind = (value: unknown): value is ChatKind => {
  return (
    value === 'user' ||
    value === 'bot' ||
    value === 'group' ||
    value === 'supergroup' ||
    value === 'channel'
  )
}

export const getChats = async (user: InstanceUser, signal?: AbortSignal): Promise<Chat[]> => {
  const data = await requestJson(user, 'getChats', signal)
  if (!Array.isArray(data)) {
    throw new Error('Не удалось загрузить список чатов.')
  }

  const personalChats = data.filter(
    (item: unknown): item is Record<string, unknown> & { chatId: string } =>
      isRecord(item) &&
      item.type === 'user' &&
      typeof item.chatId === 'string' &&
      item.chatId.length > 0,
  )

  return personalChats.map((item): Chat => ({
    chatId: item.chatId,
    name: typeof item.name === 'string' && item.name.trim() ? item.name : item.chatId,
    type: 'user',
    phoneNumber:
      typeof item.phoneNumber === 'number' && item.phoneNumber > 0
        ? String(item.phoneNumber)
        : null,
    username: typeof item.username === 'string' ? item.username : '',
    source: 'api',
  }))
}

export const checkAccount = async (
  user: InstanceUser,
  phoneNumber: string,
  signal?: AbortSignal,
): Promise<CheckAccountResult> => {
  if (!/^[1-9]\d{7,14}$/.test(phoneNumber) || !Number.isSafeInteger(Number(phoneNumber))) {
    throw new Error('Некорректный номер. Введите от 8 до 15 цифр.')
  }

  const data = await requestJson(user, 'checkAccount', signal, { phoneNumber: Number(phoneNumber) })
  if (!isRecord(data)) throw new Error(errorTexts.CHECK_NUMBER)

  if (data.status === false) {
    const reason =
      typeof data.reason === 'string'
        ? data.reason
        : isRecord(data.data) && typeof data.data.reason === 'string'
          ? data.data.reason
          : ''
    if (reason === 'rate_limit_exceeded') {
      throw new Error('Лимит проверок номеров исчерпан.')
    }
    throw new Error(errorTexts.CHECK_NUMBER)
  }
  if (data.exist === false) return { exist: false }
  if (data.exist !== true || typeof data.chatId !== 'string' || data.chatId.length === 0) {
    throw new Error(errorTexts.CHECK_NUMBER)
  }

  return {
    exist: true,
    chatId: data.chatId,
    username: typeof data.username === 'string' ? data.username : '',
    phoneNumber,
  }
}

export const sendTextMessage = async (
  user: InstanceUser,
  chatId: string,
  message: string,
): Promise<string> => {
  if (message.length === 0 || message.length > 4096) {
    throw new Error('Сообщение должно содержать от 1 до 4096 символов.')
  }
  const data = await requestJson(user, 'sendMessage', undefined, { chatId, message })
  if (!isRecord(data) || typeof data.idMessage !== 'string' || data.idMessage.length === 0) {
    throw new Error(
      'Не удалось подтвердить отправку. Проверьте чат в Telegram перед повторной отправкой.',
    )
  }
  return data.idMessage
}

export const getChatHistory = async (
  user: InstanceUser,
  chatId: string,
  signal?: AbortSignal,
): Promise<TextMessage[]> => {
  const data = await requestJson(user, 'getChatHistory', signal, { chatId, count: 20 })
  if (!Array.isArray(data)) {
    throw new Error('Не удалось загрузить историю чата. Попробуйте снова.')
  }

  return data.flatMap((item: unknown): TextMessage[] => {
    if (
      !isRecord(item) ||
      item.chatId !== chatId ||
      item.chatType !== 'user' ||
      item.typeMessage !== 'textMessage' ||
      (item.type !== 'incoming' && item.type !== 'outgoing') ||
      typeof item.idMessage !== 'string' ||
      item.idMessage.length === 0 ||
      typeof item.timestamp !== 'number' ||
      !Number.isSafeInteger(item.timestamp) ||
      typeof item.textMessage !== 'string' ||
      item.isDeleted === true
    ) {
      return []
    }

    return [
      {
        chatId,
        idMessage: item.idMessage,
        text: item.textMessage,
        timestamp: item.timestamp,
        direction: item.type,
      },
    ]
  })
}

export const receiveNotification = async (
  user: InstanceUser,
  signal: AbortSignal,
): Promise<ReceivedNotification | null> => {
  const data = await requestJson(user, 'receiveNotification', signal)
  if (data === null) return null
  if (
    !isRecord(data) ||
    typeof data.receiptId !== 'number' ||
    !Number.isSafeInteger(data.receiptId) ||
    data.receiptId < 0 ||
    !isRecord(data.body)
  ) {
    throw new Error(errorTexts.UNREADABLE_NOTIFICATION_MESSAGE)
  }

  const body = data.body
  if (
    body.typeWebhook !== 'incomingMessageReceived' &&
    body.typeWebhook !== 'outgoingMessageReceived' &&
    body.typeWebhook !== 'outgoingAPIMessageReceived'
  ) {
    return { receiptId: data.receiptId, message: null, chat: null }
  }

  if (!isRecord(body.messageData)) {
    throw new Error(errorTexts.UNREADABLE_NOTIFICATION_MESSAGE)
  }
  const messageData = body.messageData
  let text: string
  if (messageData.typeMessage === 'textMessage') {
    if (
      !isRecord(messageData.textMessageData) ||
      typeof messageData.textMessageData.textMessage !== 'string'
    ) {
      throw new Error(errorTexts.UNREADABLE_NOTIFICATION_MESSAGE)
    }
    text = messageData.textMessageData.textMessage
  } else if (messageData.typeMessage === 'extendedTextMessage') {
    if (
      !isRecord(messageData.extendedTextMessageData) ||
      typeof messageData.extendedTextMessageData.text !== 'string'
    ) {
      throw new Error(errorTexts.UNREADABLE_NOTIFICATION_MESSAGE)
    }
    text = messageData.extendedTextMessageData.text
  } else {
    return { receiptId: data.receiptId, message: null, chat: null }
  }
  if (
    !isRecord(body.senderData) ||
    typeof body.senderData.chatId !== 'string' ||
    typeof body.idMessage !== 'string' ||
    typeof body.timestamp !== 'number' ||
    !Number.isFinite(body.timestamp)
  ) {
    throw new Error(errorTexts.UNREADABLE_NOTIFICATION_MESSAGE)
  }

  const chatId = body.senderData.chatId
  const sender = body.senderData
  const name =
    typeof sender.chatName === 'string' && sender.chatName.trim().length > 0
      ? sender.chatName
      : chatId
  const chat: Chat = {
    chatId,
    name,
    type: isChatKind(sender.chatType) ? sender.chatType : 'user',
    phoneNumber:
      typeof sender.senderPhoneNumber === 'number' && sender.senderPhoneNumber > 0
        ? String(sender.senderPhoneNumber)
        : null,
    username: '',
    source: 'local',
  }
  const message: TextMessage = {
    chatId,
    idMessage: body.idMessage,
    text,
    timestamp: body.timestamp,
    direction: body.typeWebhook === 'incomingMessageReceived' ? 'incoming' : 'outgoing',
  }
  return { receiptId: data.receiptId, message, chat }
}

export const deleteNotification = async (
  user: InstanceUser,
  receiptId: number,
  signal: AbortSignal,
): Promise<void> => {
  const data = await requestJson(
    user,
    'deleteNotification',
    signal,
    undefined,
    'DELETE',
    String(receiptId),
  )
  if (!isRecord(data) || data.result !== true) {
    throw new Error('Не удалось удалить уведомление из очереди.')
  }
}
