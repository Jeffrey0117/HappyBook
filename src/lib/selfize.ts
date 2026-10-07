const SELFIZE_URL = import.meta.env.VITE_SELFIZE_URL || 'https://selfize.isnowfriend.com'
const SELFIZE_TOKEN = import.meta.env.VITE_SELFIZE_TOKEN || ''

async function request<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (SELFIZE_TOKEN) headers['authorization'] = `Bearer ${SELFIZE_TOKEN}`

  const res = await fetch(SELFIZE_URL + path, {
    ...opts,
    headers: { ...headers, ...(opts?.headers as Record<string, string>) },
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || res.statusText)
  return json
}

function buildQuery(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return ''
  return '?' + new URLSearchParams(params).toString()
}

function parseJsonFields<T>(record: any): T {
  if (!record || typeof record !== 'object') return record
  const result = { ...record }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try { result[key] = JSON.parse(value) } catch {}
    }
    if (key.endsWith('_expanded') && value && typeof value === 'object') {
      result[key] = parseJsonFields(value)
    }
  }
  return result as T
}

export interface ListResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

/* per-user collections（rules: user）：帶 LetMeUse token 的客戶端 */
function lmuHeaders(): Record<string, string> {
  const t = window.letmeuse?.getToken?.()
  return t ? { authorization: `Bearer ${t}` } : {}
}

/**
 * 原文標註：source_text 的字元區間 [s, e)。
 * k = 螢光筆 | 底線 | 批註（t = 批註內容，id 供編輯/刪除定位）。
 * c = 螢光筆分類色：y 重點（預設）| g 正例＋ | r 反例− | b 核心★ | p 立場⚑
 */
export type HighlightColor = 'y' | 'g' | 'r' | 'b' | 'p'

export interface Highlight {
  s: number
  e: number
  k: 'hl' | 'ul' | 'note'
  c?: HighlightColor
  t?: string
  id?: string
}

export interface ReadingRecord {
  id: string
  book_id: string
  chapter: string | null
  pages: string | null
  source_text: string | null
  ai_summary: string | null
  my_note: string | null
  applied_note: string | null
  topic_tags: string[] | null
  images: string[] | null
  highlights: Highlight[] | null
  visibility: 'private' | 'public' | null
  created_at: string
  updated_at: string
}

export const selfizeUser = {
  async list<T = any>(collection: string, params?: Record<string, string>): Promise<ListResult<T>> {
    const result = await request<ListResult<T>>(
      `/api/collections/${collection}/records${buildQuery(params)}`,
      { headers: lmuHeaders() },
    )
    return { ...result, items: result.items.map(item => parseJsonFields<T>(item)) }
  },
  create<T = any>(collection: string, data: Record<string, any>): Promise<T> {
    return request(`/api/collections/${collection}/records`, {
      method: 'POST',
      headers: lmuHeaders(),
      body: JSON.stringify(data),
    })
  },
  update<T = any>(collection: string, id: string, data: Record<string, any>): Promise<T> {
    return request(`/api/collections/${collection}/records/${id}`, {
      method: 'PUT',
      headers: lmuHeaders(),
      body: JSON.stringify(data),
    })
  },
  delete(collection: string, id: string): Promise<{ deleted: string }> {
    return request(`/api/collections/${collection}/records/${id}`, {
      method: 'DELETE',
      headers: lmuHeaders(),
    })
  },
}

export const selfize = {
  async list<T = any>(collection: string, params?: Record<string, string>): Promise<ListResult<T>> {
    const result = await request<ListResult<T>>(`/api/collections/${collection}/records${buildQuery(params)}`)
    return { ...result, items: result.items.map(item => parseJsonFields<T>(item)) }
  },

  async get<T = any>(collection: string, id: string, params?: Record<string, string>): Promise<T> {
    const result = await request<T>(`/api/collections/${collection}/records/${id}${buildQuery(params)}`)
    return parseJsonFields<T>(result)
  },

  create<T = any>(collection: string, data: Record<string, any>): Promise<T> {
    return request(`/api/collections/${collection}/records`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update<T = any>(collection: string, id: string, data: Record<string, any>): Promise<T> {
    return request(`/api/collections/${collection}/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete(collection: string, id: string): Promise<{ deleted: string }> {
    return request(`/api/collections/${collection}/records/${id}`, {
      method: 'DELETE',
    })
  },
}

// --- Types matching Selfize collections ---

export interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  location: string | null
  contact_type: 'ig' | 'line' | null
  contact_id: string | null
  city: string | null
  ig: string | null
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  owner_id: string
  title: string
  author: string | null
  cover_url: string | null
  description: string | null
  tags: string[]
  status: 'available' | 'lent_out' | 'swapping' | 'swapped'
  condition: string
  created_at: string
  updated_at: string
}

export interface Swap {
  id: string
  book_id: string
  lender_id: string
  borrower_name: string
  borrower_note: string | null
  status: 'active' | 'returned'
  returned_at: string | null
  created_at: string
  updated_at: string
}

export interface BookWithOwner extends Book {
  owner_id_expanded?: Profile
}

export interface SwapExpanded extends Swap {
  book_id_expanded?: Book
  lender_id_expanded?: Profile
}

// --- New swap request types ---

export type SwapRequestStatus = 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled'

export interface SwapRequest {
  id: string
  requester_id: string
  requester_book_id: string
  owner_id: string
  owner_book_id: string
  message: string | null
  status: SwapRequestStatus
  requester_photo_url: string | null
  owner_photo_url: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface SwapRequestExpanded extends SwapRequest {
  requester_id_expanded?: Profile
  requester_book_id_expanded?: Book
  owner_id_expanded?: Profile
  owner_book_id_expanded?: Book
}

// --- Review types ---

export interface Review {
  id: string
  user_id: string
  book_id: string
  book_title: string
  book_author: string
  content: string
  rating: 'up' | 'down' | null
  likes: string[] | null
  created_at: string
  updated_at: string
}

export interface ReviewComment {
  id: string
  review_id: string
  user_id: string
  text: string
  created_at: string
  updated_at: string
}

export interface ReviewCommentExpanded extends ReviewComment {
  user_id_expanded?: Profile
}

export interface ReviewExpanded extends Review {
  user_id_expanded?: Profile
}

// --- Feed post types（讀書版 Threads）---

export interface PostQuote {
  text: string
  c: HighlightColor
}

export interface Post {
  id: string
  user_id: string
  text: string
  book_id: string | null
  book_title: string | null
  book_cover: string | null
  quote: PostQuote | null
  kind: 'post' | 'review' | 'record'
  ref_id: string | null
  likes: string[] | null
  reply_to: string | null
  created_at: string
  updated_at: string
}

export interface PostExpanded extends Post {
  user_id_expanded?: Profile
}
