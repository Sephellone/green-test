import { Link, useParams } from 'react-router'
import { useChatPanelController } from '../chatPanelController'
import { useChatStore } from '../../../store/chatStore'

interface ConversationProps {
  chatId: string
}

const Conversation = ({ chatId }: ConversationProps) => {
  const chat = useChatStore((state) => state.chats.find((item) => item.chatId === chatId))
  const {
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
  } = useChatPanelController(chatId)

  return (
    <section className="chats__conversation">
      <header className="chats__conversation-header">
        <Link className="chats__back" to="/chats">
          ←
        </Link>
        <div>
          <h2 className="chats__conversation-name">{chat?.name ?? chatId}</h2>
          {chat?.username && <span className="chats__conversation-detail">{chat.username}</span>}
        </div>
      </header>
      {historyError && (
        <div className="chats__history-error">
          <span>{historyError}</span>
          <button className="chats__retry" type="button" onClick={retryHistory}>
            Повторить
          </button>
        </div>
      )}
      {notificationError && (
        <div className="chats__notification-error">
          <span>{notificationError}</span>
          <button className="chats__retry" type="button" onClick={retryNotifications}>
            Повторить
          </button>
        </div>
      )}
      <div className="chats__messages" ref={messagesRef}>
        {messages.length === 0 ? (
          <p className="chats__conversation-empty">
            {historyStatus === 'loading'
              ? 'Загружаем последние сообщения…'
              : historyStatus === 'error'
                ? 'История чата пока недоступна.'
                : 'Среди последних 20 сообщений нет текстовых.'}
          </p>
        ) : (
          messages.map((message) => (
            <div
              className={`chats__message chats__message--${message.direction}`}
              key={message.idMessage}
            >
              <p className="chats__message-text">{message.text}</p>
              <time
                className="chats__message-time"
                dateTime={new Date(message.timestamp * 1000).toISOString()}
              >
                {new Date(message.timestamp * 1000).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          ))
        )}
      </div>
      <form className="chats__composer" onSubmit={handleSend}>
        <label className="chats__composer-label" htmlFor="chat-message">
          Сообщение
        </label>
        <textarea
          className="chats__composer-input"
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение…"
          rows={1}
          disabled={isSending}
        />
        <button
          className="chats__composer-send"
          type="submit"
          disabled={isSending || draft.trim().length === 0}
        >
          {isSending ? '…' : '🡒'}
        </button>
        {sendError && <p className="chats__composer-error">{sendError}</p>}
      </form>
    </section>
  )
}

export const ChatPanel = () => {
  const { chatId } = useParams<{ chatId: string }>()
  return chatId ? <Conversation key={chatId} chatId={chatId} /> : null
}
