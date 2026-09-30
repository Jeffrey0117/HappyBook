/**
 * Check all book covers and fix broken ones via Google Books API
 */

const API = 'https://selfize.isnowfriend.com'
const TOKEN = 'selfize-dev-token'

async function getGoogleCover(title, author) {
  const q = encodeURIComponent(`${title} ${author || ''}`.trim())
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5`)
  const data = await res.json()
  if (!data.items) return null
  for (const item of data.items) {
    const thumb = item.volumeInfo?.imageLinks?.thumbnail
    if (thumb) return thumb.replace('zoom=1', 'zoom=2').replace('&edge=curl', '')
  }
  return null
}

async function main() {
  const res = await fetch(`${API}/api/collections/books/records?limit=500`, {
    headers: { 'authorization': `Bearer ${TOKEN}` },
  })
  const { items: books } = await res.json()

  console.log(`Checking ${books.length} book covers...\n`)

  const broken = []

  for (const book of books) {
    if (!book.cover_url) { broken.push(book); continue }

    try {
      const r = await fetch(book.cover_url)
      const buf = await r.arrayBuffer()
      if (buf.byteLength < 200) {
        console.log(`  [BROKEN] ${book.title} — ${buf.byteLength} bytes`)
        broken.push(book)
      } else {
        console.log(`  [OK]     ${book.title} — ${(buf.byteLength / 1024).toFixed(0)}KB`)
      }
    } catch (err) {
      console.log(`  [ERROR]  ${book.title} — ${err.message}`)
      broken.push(book)
    }
  }

  if (broken.length === 0) {
    console.log('\nAll covers OK!')
    return
  }

  console.log(`\nFixing ${broken.length} broken covers...\n`)

  for (const book of broken) {
    const newCover = await getGoogleCover(book.title, book.author)
    if (!newCover) {
      console.log(`  [FAIL] ${book.title} — no Google Books cover found`)
      continue
    }

    const patchRes = await fetch(`${API}/api/collections/books/records/${book.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify({ cover_url: newCover }),
    })

    if (patchRes.ok) {
      console.log(`  [FIXED] ${book.title} → ${newCover.substring(0, 60)}...`)
    } else {
      console.log(`  [FAIL]  ${book.title} — patch failed`)
    }

    await new Promise(r => setTimeout(r, 400))
  }
}

main().catch(console.error)
