import { useEffect, useState, useCallback } from 'react'
import { selfize, type Profile } from '@/lib/selfize'
import { useAuth } from './use-auth'

export function useProfile() {
  const { user, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfile(null)
      setLoading(false)
      return
    }

    syncProfile()
  }, [user, isAuthenticated])

  const syncProfile = async () => {
    if (!user) return

    try {
      const { items } = await selfize.list<Profile>('profiles', {
        user_id: user.id,
        limit: '1',
      })

      if (items.length > 0) {
        const existing = items[0]
        // LetMeUse 沒頭貼時不要把自訂的 avatar_url 洗成 null
        const needsUpdate =
          existing.display_name !== user.displayName ||
          (!!user.avatar && existing.avatar_url !== user.avatar)

        if (needsUpdate) {
          const updated = await selfize.update<Profile>('profiles', existing.id, {
            display_name: user.displayName,
            ...(user.avatar ? { avatar_url: user.avatar } : {}),
          })
          setProfile(updated)
        } else {
          setProfile(existing)
        }
      } else {
        const created = await selfize.create<Profile>('profiles', {
          user_id: user.id,
          display_name: user.displayName,
          avatar_url: user.avatar || null,
        })
        setProfile(created)
      }
    } catch (error) {
      console.error('Profile sync failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = useCallback(async (data: Partial<Pick<Profile, 'contact_type' | 'contact_id' | 'city' | 'bio' | 'location'>>) => {
    const current = profile
    if (!current) throw new Error('Profile not loaded')
    const updated = await selfize.update<Profile>('profiles', current.id, data)
    setProfile(updated)
    return updated
  }, [profile])

  return { profile, loading, updateProfile }
}
