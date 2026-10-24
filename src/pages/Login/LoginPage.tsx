import { useLoginController } from './controller'
import './login.scss'

export const LoginPage = () => {
  const {
    idInstance,
    setIdInstance,
    apiTokenInstance,
    setApiTokenInstance,
    phase,
    error,
    qrCode,
    handleSubmit,
    cancelQr,
  } = useLoginController()

  const isBusy = phase === 'checking' || phase === 'waiting' || phase === 'configuring'

  return (
    <main className="login">
      <section className="login__intro">
        <span className="login__eyebrow">TELEGRAM × GREEN-API</span>
        <h1 className="login__headline">
          Ваши чаты
          <br />в одном окне.
        </h1>
        <p className="login__lead">
          Подключите существующий инстанс GREEN-API для Telegram, чтобы открыть переписку в
          браузере.
        </p>
        <span className="login__note">
          Данные доступа сохраняются в этой сессии браузера и удаляются при выходе.
        </span>
      </section>

      <section className="login__card">
        <h2 className="login__title" id="login-title">
          {phase === 'waiting'
            ? 'Подключите Telegram'
            : phase === 'configuring'
              ? 'Настраиваем инстанс'
              : 'Войти'}
        </h2>
        <p className="login__description">
          {phase === 'waiting'
            ? 'Отсканируйте QR-код в приложении Telegram на телефоне.'
            : phase === 'configuring'
              ? 'Проверяем настройки уведомлений перед открытием чатов.'
              : 'Введите данные инстанса из личного кабинета GREEN-API.'}
        </p>

        {phase === 'waiting' ? (
          <div className="login__qr">
            <div className="login__qr-header">
              <button className="login__cancel" type="button" onClick={cancelQr}>
                Отмена
              </button>
            </div>
            <p className="login__qr-description">
              Откройте Telegram → Настройки → Устройства → Подключить устройство и отсканируйте код.
            </p>
            {qrCode ? (
              <img
                className="login__qr-image"
                src={`data:image/png;base64,${qrCode}`}
                alt="QR-код для подключения Telegram"
              />
            ) : (
              <div className="login__qr-loading">Получаем QR-код…</div>
            )}
            <span className="login__qr-note">
              Код обновится автоматически. После подключения чаты откроются сами.
            </span>
          </div>
        ) : phase === 'configuring' ? (
          <p className="login__configuring">Подключаем получение сообщений…</p>
        ) : (
          <form className="login__form" onSubmit={handleSubmit}>
            <label className="login__label" htmlFor="id-instance">
              idInstance
            </label>
            <input
              className="login__input"
              id="id-instance"
              name="idInstance"
              inputMode="numeric"
              autoComplete="off"
              value={idInstance}
              onChange={(event) => setIdInstance(event.target.value)}
              placeholder="Например, 1101000000"
              disabled={isBusy}
              required
            />

            <label className="login__label" htmlFor="api-token">
              apiTokenInstance
            </label>
            <input
              className="login__input"
              id="api-token"
              name="apiTokenInstance"
              type="password"
              autoComplete="off"
              value={apiTokenInstance}
              onChange={(event) => setApiTokenInstance(event.target.value)}
              placeholder="Токен вашего инстанса"
              disabled={isBusy}
              required
            />

            {error && <p className="login__error">{error}</p>}
            <button className="login__submit" type="submit" disabled={isBusy}>
              {phase === 'checking' ? 'Проверяем инстанс…' : 'Продолжить'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
