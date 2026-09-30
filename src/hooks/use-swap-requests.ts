import { useState, useEffect, useCallback } from 'react'
import { selfize, type SwapRequest, type SwapRequestExpanded } from '@/lib/selfize'
import { uploadCoverPhoto } from '@/lib/upload'

export function useSwapRequests(profileId: string | undefined) {
  const [incoming, setIncoming] = useState<SwapRequestExpanded[]>([])
  const [outgoing, setOutgoing] = useState<SwapRequestExpanded[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchIncoming = useCallback(async () => {
    if (!profileId) return
    const { items } = await selfize.list<SwapRequestExpanded>('swap_requests', {
      owner_id: profileId,
      sort: '-created_at',
      limit: '100',
      expand: 'requester_id,requester_book_id,owner_book_id',
    })
    setIncoming(items)
    setPendingCount(items.filter((r) => r.status === 'pending').length)
  }, [profileId])

  const fetchOutgoing = useCallback(async () => {
    if (!profileId) return
    const { items } = await selfize.list<SwapRequestExpanded>('swap_requests', {
      requester_id: profileId,
      sort: '-created_at',
      limit: '100',
      expand: 'owner_id,requester_book_id,owner_book_id',
    })
    setOutgoing(items)
  }, [profileId])

  useEffect(() => {
    if (!profileId) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        await Promise.all([fetchIncoming(), fetchOutgoing()])
      } catch (error) {
        console.error('Failed to fetch swap requests:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profileId, fetchIncoming, fetchOutgoing])

  const createRequest = async (data: {
    requester_id: string
    requester_book_id: string
    owner_id: string
    owner_book_id: string
    message?: string
  }) => {
    const request = await selfize.create<SwapRequest>('swap_requests', {
      ...data,
      message: data.message || null,
      status: 'pending',
    })
    await fetchOutgoing()
    return request
  }

  const acceptRequest = async (requestId: string) => {
    const request = await selfize.get<SwapRequest>('swap_requests', requestId)

    // Update request status
    await selfize.update('swap_requests', requestId, { status: 'accepted' })

    // Mark both books as swapping
    await Promise.all([
      selfize.update('books', request.owner_book_id, { status: 'swapping' }),
      selfize.update('books', request.requester_book_id, { status: 'swapping' }),
    ])

    // Auto-reject other pending requests for either book
    await rejectOtherRequests(request.owner_book_id, requestId)
    await rejectOtherRequests(request.requester_book_id, requestId)

    // Cancel outgoing requests where requester's book is now taken
    await cancelConflictingRequests(request.requester_book_id, requestId)

    await fetchIncoming()
    await fetchOutgoing()
  }

  const rejectRequest = async (requestId: string) => {
    await selfize.update('swap_requests', requestId, { status: 'rejected' })
    await fetchIncoming()
  }

  const cancelRequest = async (requestId: string) => {
    await selfize.update('swap_requests', requestId, { status: 'cancelled' })
    await fetchOutgoing()
  }

  const uploadPhoto = async (requestId: string, file: File, role: 'requester' | 'owner') => {
    const url = await uploadCoverPhoto(file)
    const field = role === 'requester' ? 'requester_photo_url' : 'owner_photo_url'
    await selfize.update('swap_requests', requestId, { [field]: url })

    // Check if both photos are uploaded → auto-complete
    const updated = await selfize.get<SwapRequest>('swap_requests', requestId)
    if (updated.requester_photo_url && updated.owner_photo_url) {
      await selfize.update('swap_requests', requestId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      // Mark books as swapped
      await Promise.all([
        selfize.update('books', updated.owner_book_id, { status: 'swapped' }),
        selfize.update('books', updated.requester_book_id, { status: 'swapped' }),
      ])
    }

    await fetchIncoming()
    await fetchOutgoing()
    return url
  }

  return {
    incoming,
    outgoing,
    pendingCount,
    loading,
    createRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    uploadPhoto,
    refresh: async () => {
      await Promise.all([fetchIncoming(), fetchOutgoing()])
    },
  }
}

async function rejectOtherRequests(bookId: string, excludeRequestId: string) {
  const { items } = await selfize.list<SwapRequest>('swap_requests', {
    owner_book_id: bookId,
    status: 'pending',
    limit: '100',
  })
  const toReject = items.filter((r) => r.id !== excludeRequestId)
  await Promise.all(
    toReject.map((r) => selfize.update('swap_requests', r.id, { status: 'rejected' }))
  )
}

async function cancelConflictingRequests(bookId: string, excludeRequestId: string) {
  const { items } = await selfize.list<SwapRequest>('swap_requests', {
    requester_book_id: bookId,
    status: 'pending',
    limit: '100',
  })
  const toCancel = items.filter((r) => r.id !== excludeRequestId)
  await Promise.all(
    toCancel.map((r) => selfize.update('swap_requests', r.id, { status: 'cancelled' }))
  )
}
