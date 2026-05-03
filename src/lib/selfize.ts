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
      method: 'PATCH',
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
  status: 'available' | 'lent_out'
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
