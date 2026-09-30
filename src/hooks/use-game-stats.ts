import { useState, useEffect } from 'react'
import { selfize, type Book, type Swap, type SwapRequest } from '@/lib/selfize'
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
  swapCompleteCount: number
  earnedBadges: BadgeDef[]
  loading: boolean
}

export function useGameStats(profileId: string | undefined): GameStats {
  const [books, setBooks] = useState<Book[]>([])
  const [swaps, setSwaps] = useState<Swap[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      const [booksRes, swapsRes, reqAsRequester, reqAsOwner] = await Promise.all([
        selfize.list<Book>('books', { owner_id: profileId, limit: '500' }),
        selfize.list<Swap>('swaps', { lender_id: profileId, limit: '500' }),
        selfize.list<SwapRequest>('swap_requests', { requester_id: profileId, status: 'completed', limit: '500' }),
        selfize.list<SwapRequest>('swap_requests', { owner_id: profileId, status: 'completed', limit: '500' }),
      ])

      setBooks(booksRes.items)
      setSwaps(swapsRes.items)
      setSwapRequests([...reqAsRequester.items, ...reqAsOwner.items])
      setLoading(false)
    }

    fetchData()
  }, [profileId])

  const bookCount = books.length
  const swapCount = swaps.length
  const returnCount = swaps.filter((s) => s.status === 'returned').length
  const swapCompleteCount = swapRequests.length

  // Check if user has uploaded at least one photo
  const hasPhoto = swapRequests.some((r) => r.requester_photo_url || r.owner_photo_url)

  let xp = 0
  xp += bookCount * XP_RULES.ADD_BOOK
  xp += swapCount * XP_RULES.LEND_OUT
  xp += returnCount * XP_RULES.RETURN_COMPLETE
  xp += swapCompleteCount * XP_RULES.SWAP_COMPLETE
  if (bookCount >= 10) xp += XP_RULES.BOOKS_10_MILESTONE

  const levelInfo = getLevelInfo(xp)

  const earnedBadges: BadgeDef[] = []
  for (const badge of BADGES) {
    const earned = checkBadge(badge.id, bookCount, swapCount, returnCount, swapCompleteCount, hasPhoto)
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
    swapCompleteCount,
    earnedBadges,
    loading,
  }
}

function checkBadge(
  id: string,
  bookCount: number,
  swapCount: number,
  returnCount: number,
  swapCompleteCount: number,
  hasPhoto: boolean,
): boolean {
  switch (id) {
    case 'first_book': return bookCount >= 1
    case 'first_swap': return (swapCount >= 1) || (swapCompleteCount >= 1)
    case 'bookworm_10': return bookCount >= 10
    case 'swapper_5': return (swapCount + swapCompleteCount) >= 5
    case 'swapper_20': return (swapCount + swapCompleteCount) >= 20
    case 'returner': return returnCount >= 1
    case 'collector_30': return bookCount >= 30
    case 'photographer': return hasPhoto
    default: return false
  }
}
