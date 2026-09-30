import { useMemo } from 'react'
import type { Profile, Book } from '@/lib/selfize'

export interface OnboardingStatus {
  isOnboarded: boolean
  hasContact: boolean
  hasBooks: boolean
}

export function useOnboarding(profile: Profile | null, books: Book[]): OnboardingStatus {
  return useMemo(() => {
    const hasContact = !!(profile?.contact_type && profile?.contact_id && profile?.city)
    const hasBooks = books.length > 0

    return {
      isOnboarded: hasContact && hasBooks,
      hasContact,
      hasBooks,
    }
  }, [profile, books])
}
