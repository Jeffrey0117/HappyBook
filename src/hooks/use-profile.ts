import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './use-auth'
import type { Profile } from '@/integrations/supabase/types'

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
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('letmeuse_id', user.id)
        .single()

      if (existing) {
        const needsUpdate =
          existing.name !== user.displayName ||
          existing.avatar_url !== (user.avatar || null)

        if (needsUpdate) {
          const { data: updated } = await supabase
            .from('profiles')
            .update({
              name: user.displayName,
              avatar_url: user.avatar || null,
            })
            .eq('id', existing.id)
            .select()
            .single()

          setProfile(updated || existing)
        } else {
          setProfile(existing)
        }
      } else {
        const { data: created } = await supabase
          .from('profiles')
          .insert({
            letmeuse_id: user.id,
            name: user.displayName,
            avatar_url: user.avatar || null,
          })
          .select()
          .single()

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
