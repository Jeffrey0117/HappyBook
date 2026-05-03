import { useEffect, useState } from 'react'
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
        const needsUpdate =
          existing.display_name !== user.displayName ||
          existing.avatar_url !== (user.avatar || null)

        if (needsUpdate) {
          const updated = await selfize.update<Profile>('profiles', existing.id, {
            display_name: user.displayName,
            avatar_url: user.avatar || null,
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

  return { profile, loading }
}
