import { useState, useEffect } from 'react'
import { selfize, type Book, type Swap } from '@/lib/selfize'
import { XP_RULES, BADGES, getLevelInfo, type BadgeDef } from '@/lib/game-config'

export interface GameStats {
  xp: number
  level: number
  title: string
  progress: number
  nextLevelXp: number
  bookCount: number
  swapCount: number
  returnCount: number
  earnedBadges: BadgeDef[]
  loading: boolean
}

export function useGameStats(profileId: string | undefined): GameStats {
  const [books, setBooks] = useState<Book[]>([])
  const [swaps, setSwaps] = useState<Swap[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      const [booksRes, swapsRes] = await Promise.all([
        selfize.list<Book>('books', { owner_id: profileId, limit: '500' }),
        selfize.list<Swap>('swaps', { lender_id: profileId, limit: '500' }),
      ])

      setBooks(booksRes.items)
      setSwaps(swapsRes.items)
      setLoading(false)
    }

    fetchData()
  }, [profileId])

  const bookCount = books.length
  const swapCount = swaps.length
  const returnCount = swaps.filter((s) => s.status === 'returned').length

  let xp = 0
  xp += bookCount * XP_RULES.ADD_BOOK
  xp += swapCount * XP_RULES.LEND_OUT
  xp += returnCount * XP_RULES.RETURN_COMPLETE
  if (bookCount >= 10) xp += XP_RULES.BOOKS_10_MILESTONE

  const levelInfo = getLevelInfo(xp)

  const earnedBadges: BadgeDef[] = []
  for (const badge of BADGES) {
    const earned = checkBadge(badge.id, bookCount, swapCount, returnCount)
    if (earned) earnedBadges.push(badge)
  }

  return {
    xp,
    level: levelInfo.level,
    title: levelInfo.title,
    progress: levelInfo.progress,
    nextLevelXp: levelInfo.nextLevelXp,
    bookCount,
    swapCount,
    returnCount,
    earnedBadges,
    loading,
  }
}

function checkBadge(id: string, bookCount: number, swapCount: number, returnCount: number): boolean {
  switch (id) {
    case 'first_book': return bookCount >= 1
    case 'first_swap': return swapCount >= 1
    case 'bookworm_10': return bookCount >= 10
    case 'swapper_5': return swapCount >= 5
    case 'swapper_20': return swapCount >= 20
    case 'returner': return returnCount >= 1
    case 'collector_30': return bookCount >= 30
    default: return false
  }
}
