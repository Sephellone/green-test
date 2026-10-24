export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Произошла неизвестная ошибка.'

export const delay = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }

    const onAbort = (): void => {
      window.clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
