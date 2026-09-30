/**
 * HappyBook Seed Script
 * 建立假 profiles + 真實書籍資料，讓書架看起來有人在用
 *
 * Usage: node scripts/seed.mjs
 */

const API = 'https://selfize.isnowfriend.com'
const TOKEN = 'selfize-dev-token'

async function post(path, data) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`${path}: ${json.error || res.statusText}`)
  return json
}

// --- Profiles ---
const profiles = [
  { user_id: 'seed-user-01', display_name: '小書蟲 Mia', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Mia', bio: '什麼書都看，最愛推理小說', location: '台北' },
  { user_id: 'seed-user-02', display_name: '阿凱讀書', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Kai', bio: '每月一本，記錄成長', location: '新竹' },
  { user_id: 'seed-user-03', display_name: 'Amber', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Amber', bio: '文學系畢業，偏愛散文和詩', location: '台中' },
  { user_id: 'seed-user-04', display_name: '工程師老王', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Wang', bio: '寫程式也讀書', location: '台北' },
  { user_id: 'seed-user-05', display_name: 'Yuki', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Yuki', bio: '日系小說控', location: '高雄' },
  { user_id: 'seed-user-06', display_name: '書櫃太滿了', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Full', bio: '書太多放不下，來換書！', location: '桃園' },
  { user_id: 'seed-user-07', display_name: 'Leo 的書房', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Leo', bio: '商業書 & 心理學', location: '台南' },
  { user_id: 'seed-user-08', display_name: '讀墨少女', avatar_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=Reader', bio: '從紙本到電子都愛', location: '台北' },
]

// --- Books (popular Taiwan market books with Google Books / Open Library covers) ---
const books = [
  // Profile 0 - 小書蟲 Mia (推理/暢銷)
  { owner: 0, title: '原子習慣', author: 'James Clear', tags: ['自我成長', '習慣'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861755267-L.jpg' },
  { owner: 0, title: '被討厭的勇氣', author: '岸見一郎', tags: ['心理學', '哲學'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861371955-L.jpg' },
  { owner: 0, title: '解憂雜貨店', author: '東野圭吾', tags: ['推理', '日本文學'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861335797-L.jpg' },
  { owner: 0, title: '嫌疑犯X的獻身', author: '東野圭吾', tags: ['推理', '日本文學'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861332377-L.jpg' },
  { owner: 0, title: '82年生的金智英', author: '趙南柱', tags: ['文學', '韓國'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789573334743-L.jpg' },

  // Profile 1 - 阿凱讀書 (成長/商業)
  { owner: 1, title: '刻意練習', author: 'Anders Ericsson', tags: ['自我成長', '學習'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861343112-L.jpg' },
  { owner: 1, title: '快思慢想', author: 'Daniel Kahneman', tags: ['心理學', '思考'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789863206729-L.jpg' },
  { owner: 1, title: '人類大歷史', author: 'Yuval Noah Harari', tags: ['歷史', '科普'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789864893485-L.jpg' },
  { owner: 1, title: '致富心態', author: 'Morgan Housel', tags: ['理財', '投資'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789863986744-L.jpg' },
  { owner: 1, title: '子彈思考整理術', author: 'Ryder Carroll', tags: ['生產力', '筆記'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789863984948-L.jpg' },
  { owner: 1, title: '底層邏輯', author: '劉潤', tags: ['商業', '思考'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9786263101609-L.jpg' },

  // Profile 2 - Amber (文學/散文)
  { owner: 2, title: '小王子', author: 'Antoine de Saint-Exupéry', tags: ['文學', '經典'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789573255499-L.jpg' },
  { owner: 2, title: '挪威的森林', author: '村上春樹', tags: ['文學', '日本文學'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789571313214-L.jpg' },
  { owner: 2, title: '百年孤寂', author: 'Gabriel García Márquez', tags: ['文學', '經典'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789573327370-L.jpg' },
  { owner: 2, title: '正常人', author: 'Sally Rooney', tags: ['文學', '愛情'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789573338048-L.jpg' },
  { owner: 2, title: '一個人的朝聖', author: 'Rachel Joyce', tags: ['文學', '英國'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789863231646-L.jpg' },

  // Profile 3 - 工程師老王 (技術/科普)
  { owner: 3, title: 'Clean Code', author: 'Robert C. Martin', tags: ['程式設計', '軟體工程'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg' },
  { owner: 3, title: '重構', author: 'Martin Fowler', tags: ['程式設計', '軟體工程'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg' },
  { owner: 3, title: '鳳凰專案', author: 'Gene Kim', tags: ['DevOps', '管理'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9780988262508-L.jpg' },
  { owner: 3, title: '人月神話', author: 'Frederick Brooks', tags: ['軟體工程', '經典'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9780201835953-L.jpg' },
  { owner: 3, title: '矽谷最夯的科技趨勢', author: '日經科技', tags: ['科技', '趨勢'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789864799275-L.jpg' },

  // Profile 4 - Yuki (日系小說)
  { owner: 4, title: '你的名字', author: '新海誠', tags: ['日本文學', '愛情'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789863426462-L.jpg' },
  { owner: 4, title: '如果這世界貓消失了', author: '川村元氣', tags: ['日本文學', '奇幻'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789571364988-L.jpg' },
  { owner: 4, title: '蜜蜂與遠雷', author: '恩田陸', tags: ['日本文學', '音樂'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789573283560-L.jpg' },
  { owner: 4, title: '告白', author: '湊佳苗', tags: ['推理', '日本文學'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789571351735-L.jpg' },
  { owner: 4, title: '在咖啡冷掉之前', author: '川口俊和', tags: ['日本文學', '奇幻'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789573280729-L.jpg' },
  { owner: 4, title: '圖書館戰爭', author: '有川浩', tags: ['日本文學', '冒險'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789862131299-L.jpg' },

  // Profile 5 - 書櫃太滿了 (雜食)
  { owner: 5, title: '富爸爸窮爸爸', author: 'Robert Kiyosaki', tags: ['理財', '經典'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg' },
  { owner: 5, title: '恐懼與貪婪', author: '秋刀魚', tags: ['投資', '股市'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9786267491089-L.jpg' },
  { owner: 5, title: '蛤蟆先生去看心理師', author: 'Robert de Board', tags: ['心理學', '治癒'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861337623-L.jpg' },
  { owner: 5, title: '薩提爾的對話練習', author: '李崇建', tags: ['心理學', '溝通'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789869583657-L.jpg' },
  { owner: 5, title: '斜槓青年', author: 'Susan Kuang', tags: ['自我成長', '職涯'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861343334-L.jpg' },

  // Profile 6 - Leo 的書房 (商業/心理)
  { owner: 6, title: '從0到1', author: 'Peter Thiel', tags: ['商業', '創業'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg' },
  { owner: 6, title: '精準提問', author: 'Frank Sesno', tags: ['溝通', '領導'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789869400978-L.jpg' },
  { owner: 6, title: '高效能人士的七個習慣', author: 'Stephen Covey', tags: ['自我成長', '經典'], condition: '七成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9781982137274-L.jpg' },
  { owner: 6, title: '黑天鵝效應', author: 'Nassim Taleb', tags: ['思考', '經濟'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789862131305-L.jpg' },
  { owner: 6, title: '影響力', author: 'Robert Cialdini', tags: ['心理學', '行銷'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861342719-L.jpg' },

  // Profile 7 - 讀墨少女 (暢銷/輕閱讀)
  { owner: 7, title: '會說話的人運氣都不差', author: '矢野香', tags: ['溝通', '日本'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789571375311-L.jpg' },
  { owner: 7, title: '情緒勒索', author: '周慕姿', tags: ['心理學', '人際關係'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789864061563-L.jpg' },
  { owner: 7, title: '你想活出怎樣的人生', author: '吉野源三郎', tags: ['文學', '成長'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861372778-L.jpg' },
  { owner: 7, title: '每天最重要的2小時', author: 'Josh Davis', tags: ['生產力', '時間管理'], condition: '八成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861342948-L.jpg' },
  { owner: 7, title: '跟著柴鼠學FQ', author: '柴鼠兄弟', tags: ['理財', '入門'], condition: '九成新', cover_url: 'https://covers.openlibrary.org/b/isbn/9789861344478-L.jpg' },
]

// --- Some swaps to show activity ---
const swaps = [
  { bookOwner: 0, bookIndex: 2, borrower_name: 'Yuki', borrower_note: '好想看解憂雜貨店！可以約捷運站面交嗎？' },
  { bookOwner: 1, bookIndex: 3, borrower_name: 'Amber', borrower_note: '一直想讀這本，感謝分享' },
  { bookOwner: 4, bookIndex: 0, borrower_name: '阿凱讀書', borrower_note: '你的名字超好看，想借來重溫' },
  { bookOwner: 6, bookIndex: 0, borrower_name: '小書蟲 Mia', borrower_note: '創業必讀！' },
]

async function seed() {
  console.log('=== Seeding HappyBook ===\n')

  // 1. Create profiles
  console.log('Creating profiles...')
  const profileIds = []
  for (const p of profiles) {
    const result = await post('/api/collections/profiles/records', p)
    profileIds.push(result.id)
    console.log(`  + ${p.display_name} (${result.id})`)
  }

  // 2. Create books
  console.log('\nCreating books...')
  const bookRecords = []
  for (const b of books) {
    const data = {
      owner_id: profileIds[b.owner],
      title: b.title,
      author: b.author,
      cover_url: b.cover_url,
      tags: JSON.stringify(b.tags),
      status: 'available',
      condition: b.condition,
    }
    const result = await post('/api/collections/books/records', data)
    bookRecords.push(result)
    console.log(`  + ${b.title} — ${b.author}`)
  }

  // 3. Create swaps (mark some books as lent_out)
  console.log('\nCreating swaps...')
  for (const s of swaps) {
    // Find the book record
    const ownerBooks = bookRecords.filter(
      (_, i) => books[i].owner === s.bookOwner
    )
    const book = ownerBooks[s.bookIndex]
    if (!book) {
      console.log(`  ! Swap skipped: book not found`)
      continue
    }

    // Create the swap
    await post('/api/collections/swaps/records', {
      book_id: book.id,
      lender_id: profileIds[s.bookOwner],
      borrower_name: s.borrower_name,
      borrower_note: s.borrower_note,
      status: 'active',
    })

    // Mark book as lent_out
    const patchRes = await fetch(`${API}/api/collections/books/records/${book.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ status: 'lent_out' }),
    })
    if (!patchRes.ok) console.log(`  ! Failed to mark ${book.id} as lent_out`)

    console.log(`  + ${books.find(b => b.title === book.title)?.title || book.id} → ${s.borrower_name}`)
  }

  console.log('\n=== Done! ===')
  console.log(`Profiles: ${profileIds.length}`)
  console.log(`Books: ${bookRecords.length}`)
  console.log(`Swaps: ${swaps.length}`)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
