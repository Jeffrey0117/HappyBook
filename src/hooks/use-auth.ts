import { useEffect, useState, useCallback } from 'react'

export interface LetMeUseUser {
  id: string
  email: string
  displayName: string
  avatar?: string
  role: string
  appId: string
}

declare global {
  interface Window {
    letmeuse?: {
      ready: boolean
      user: LetMeUseUser | null
      login(): void
      register(): void
      logout(): Promise<void>
      getToken(): string | null
      onAuthChange(cb: (user: LetMeUseUser | null) => void): () => void
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState<LetMeUseUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const init = () => {
      const lmu = window.letmeuse
      if (!lmu) return false

      setUser(lmu.user)
      if (lmu.ready) setIsReady(true)

      if (!unsubscribe) {
        unsubscribe = lmu.onAuthChange((newUser) => {
          setUser(newUser)
          setIsReady(true) // auth settled ⇒ SDK ready（ready flag 可能晚於事件）
        })
      }

      return lmu.ready
    }

    // 輪詢到 SDK 真正 ready 為止（物件出現 ≠ ready，背景 refresh 可能還在飛）
    let interval: ReturnType<typeof setInterval> | undefined
    if (!init()) {
      interval = setInterval(() => {
        if (init()) clearInterval(interval)
      }, 100)
    }
    // 保險絲：SDK 卡住也別讓頁面永遠轉圈
    const fuse = setTimeout(() => setIsReady(true), 8000)

    return () => {
      if (interval) clearInterval(interval)
      clearTimeout(fuse)
      unsubscribe?.()
    }
  }, [])

  const login = useCallback(() => window.letmeuse?.login(), [])
  const logout = useCallback(() => window.letmeuse?.logout(), [])

  return { user, isReady, login, logout, isAuthenticated: !!user }
}
