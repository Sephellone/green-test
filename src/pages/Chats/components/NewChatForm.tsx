import type { Dispatch, SetStateAction, SubmitEventHandler } from 'react'

interface NewChatFormProps {
  phoneNumber: string
  setPhoneNumber: Dispatch<SetStateAction<string>>
  isChecking: boolean
  error: string | null
  onSubmit: SubmitEventHandler<HTMLFormElement>
  onCancel: () => void
}

export const NewChatForm = ({
  phoneNumber,
  setPhoneNumber,
  isChecking,
  error,
  onSubmit,
  onCancel,
}: NewChatFormProps) => (
  <form className="chats__new-chat" onSubmit={onSubmit}>
    <label className="chats__new-chat-label" htmlFor="new-chat-phone">
      Номер телефона
    </label>
    <input
      className="chats__new-chat-input"
      id="new-chat-phone"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="+7 900 123 45 67"
      value={phoneNumber}
      onChange={(event) => setPhoneNumber(event.target.value)}
      disabled={isChecking}
      required
      autoFocus
    />
    {error && <p className="chats__new-chat-error">{error}</p>}
    <div className="chats__new-chat-actions">
      <button
        className="chats__new-chat-cancel"
        type="button"
        onClick={onCancel}
        disabled={isChecking}
      >
        Отмена
      </button>
      <button className="chats__new-chat-submit" type="submit" disabled={isChecking}>
        {isChecking ? 'Проверяем…' : 'Найти чат'}
      </button>
    </div>
  </form>
)
