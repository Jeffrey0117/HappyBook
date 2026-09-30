/**
 * Fix broken book covers
 * Checks each book's cover_url, replaces broken ones with Google Books covers
 *
 * Usage: node scripts/fix-covers.mjs
 */

const API = 'https://selfize.isnowfriend.com'
const TOKEN = 'selfize-dev-token'

async function fetchJson(url, opts) {
  const res = await fetch(url, opts)
  return res.json()
}

async function getGoogleCover(title, author) {
  const q = encodeURIComponent(`${title} ${author}`)
  const data = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`)
  if (!data.items) return null
  for (const item of data.items) {
    const thumb = item.volumeInfo?.imageLinks?.thumbnail
    if (thumb) {
      // upgrade to larger image
      return thumb.replace('zoom=1', 'zoom=2').replace('&edge=curl', '')
    }
  }
  return null
}

async function isBrokenCover(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    const len = res.headers.get('content-length')
    // Open Library returns 43-byte placeholder for missing covers
    if (len && parseInt(len) < 200) return true
    if (!res.ok) return true
    return false
  } catch {
    return true
  }
}

async function main() {
  // Get all books
  const { items: books } = await fetchJson(`${API}/api/collections/books/records?limit=500`, {
    headers: { 'authorization': `Bearer ${TOKEN}` },
  })

  console.log(`Checking ${books.length} books...\n`)

  let fixed = 0
  let failed = 0

  for (const book of books) {
    if (!book.cover_url) {
      console.log(`  [SKIP] ${book.title} — no cover_url`)
      continue
    }

    const broken = await isBrokenCover(book.cover_url)
    if (!broken) {
      console.log(`  [OK]   ${book.title}`)
      continue
    }

    console.log(`  [FIX]  ${book.title} — searching Google Books...`)
    const newCover = await getGoogleCover(book.title, book.author)

    if (!newCover) {
      console.log(`         -> no cover found`)
      failed++
      continue
    }

    // Update in Selfize
    const res = await fetch(`${API}/api/collections/books/records/${book.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ cover_url: newCover }),
    })

    if (res.ok) {
      console.log(`         -> updated`)
      fixed++
    } else {
      console.log(`         -> update failed`)
      failed++
    }

    // Small delay to avoid rate limiting Google
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone! Fixed: ${fixed}, Failed: ${failed}`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
