import { useEffect, useState, useCallback } from 'react'
import { selfize, type Profile } from '@/lib/selfize'
import { useAuth } from './use-auth'
import { readCache, writeCache } from '@/lib/page-cache'

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

    // 快取先上：頭像、名字進頁瞬間就是對的，不閃預設小人
    const cached = readCache<Profile>(`profile_${user.id}`)
    if (cached) {
      setProfile(cached)
      setLoading(false)
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
          writeCache(`profile_${user.id}`, updated)
        } else {
          setProfile(existing)
          writeCache(`profile_${user.id}`, existing)
        }
      } else {
        const created = await selfize.create<Profile>('profiles', {
          user_id: user.id,
          display_name: user.displayName,
          avatar_url: user.avatar || null,
        })
        setProfile(created)
        writeCache(`profile_${user.id}`, created)
      }
    } catch (error) {
      console.error('Profile sync failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = useCallback(async (data: Partial<Pick<Profile, 'contact_type' | 'contact_id' | 'city' | 'bio' | 'location' | 'ig' | 'avatar_url'>>) => {
    const current = profile
    if (!current) throw new Error('Profile not loaded')
    const updated = await selfize.update<Profile>('profiles', current.id, data)
    setProfile(updated)
    if (user) writeCache(`profile_${user.id}`, updated)
    return updated
  }, [profile, user])

  return { profile, loading, updateProfile }
}
