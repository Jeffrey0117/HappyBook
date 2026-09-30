import { useState, useEffect, useCallback } from 'react'
import { selfize, type Book } from '@/lib/selfize'

export function useMyBooks(profileId: string | undefined) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBooks = useCallback(async () => {
    if (!profileId) return
    try {
      const { items } = await selfize.list<Book>('books', {
        owner_id: profileId,
        sort: '-created_at',
        limit: '500',
      })
      setBooks(items)
    } catch (error) {
      console.error('Failed to fetch books:', error)
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    if (!profileId) {
      setLoading(false)
      return
    }
    fetchBooks()
  }, [profileId, fetchBooks])

  const availableBooks = books.filter((b) => b.status === 'available')

  return { books, availableBooks, loading, refresh: fetchBooks }
}
