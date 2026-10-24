import { Outlet } from 'react-router'
import { ChatList } from './components/ChatList'
import { NewChatForm } from './components/NewChatForm'
import { useChatsController } from './controller'
import './chats.scss'

export const ChatsPage = () => {
  const {
    idInstance,
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
  } = useChatsController()

  return (
    <main className={`chats${isChatOpen ? ' chats--open' : ''}`}>
      <aside className="chats__sidebar">
        <header className="chats__sidebar-header">
          <span className="chats__eyebrow">TELEGRAM × GREEN-API</span>
          <button className="chats__sign-out" onClick={signOut}>
            Выйти
          </button>
        </header>

        <div className="chats__heading">
          <div>
            <h1 className="chats__title">Чаты</h1>
            <span className="chats__instance">Инстанс {idInstance}</span>
            <p className="chats__scope-hint">Только личные чаты.</p>
          </div>
          <button className="chats__create" onClick={openNewChat} aria-expanded={isCreating}>
            +
          </button>
        </div>

        {isCreating && (
          <NewChatForm
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            isChecking={isChecking}
            error={createError}
            onSubmit={createChat}
            onCancel={cancelNewChat}
          />
        )}

        <ChatList chats={chats} status={listStatus} onRetry={retryLoad} />
      </aside>

      <div className="chats__main">
        <Outlet />
      </div>
    </main>
  )
}
