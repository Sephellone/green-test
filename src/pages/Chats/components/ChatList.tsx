import { NavLink } from 'react-router'
import type { Chat } from '../../../api/greenApi'

interface ChatListProps {
  chats: Chat[]
  status: 'loading' | 'ready' | 'error'
  onRetry: () => void
}

const chatSubtitle = (chat: Chat): string => {
  if (chat.username) return chat.username
  if (chat.phoneNumber) return `+${chat.phoneNumber}`
  return 'Личный чат'
}

export const ChatList = ({ chats, status, onRetry }: ChatListProps) => {
  if (status === 'loading' && chats.length === 0) {
    return <p className="chats__list-message">Загружаем чаты…</p>
  }

  if (chats.length === 0) {
    return (
      <div className="chats__list-empty">
        <p>список чатов пока пуст</p>
        {status === 'error' && (
          <button className="chats__retry" type="button" onClick={onRetry}>
            Попробовать ещё раз
          </button>
        )}
      </div>
    )
  }

  return (
    <nav className="chats__list">
      {chats.map((chat) => (
        <NavLink
          className={({ isActive }) => `chats__item${isActive ? ' chats__item--active' : ''}`}
          key={chat.chatId}
          to={`/chats/${encodeURIComponent(chat.chatId)}`}
        >
          <span className="chats__avatar" aria-hidden="true">
            {chat.name.charAt(0).toUpperCase()}
          </span>
          <span className="chats__item-details">
            <span className="chats__item-name">{chat.name}</span>
            <span className="chats__detail">{chatSubtitle(chat)}</span>
          </span>
        </NavLink>
      ))}
      {status === 'error' && (
        <button className="chats__retry" type="button" onClick={onRetry}>
          Обновить список
        </button>
      )}
    </nav>
  )
}
