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
      setIsReady(lmu.ready)

      unsubscribe = lmu.onAuthChange((newUser) => {
        setUser(newUser)
      })

      return true
    }

    if (!init()) {
      const interval = setInterval(() => {
        if (init()) clearInterval(interval)
      }, 100)
      return () => clearInterval(interval)
    }

    return () => unsubscribe?.()
  }, [])

  const login = useCallback(() => window.letmeuse?.login(), [])
  const logout = useCallback(() => window.letmeuse?.logout(), [])

  return { user, isReady, login, logout, isAuthenticated: !!user }
}
