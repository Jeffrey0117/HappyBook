export const TAG_COLORS: Record<string, string> = {
  '小說': 'bg-amber-600',
  '科技': 'bg-blue-600',
  '文學': 'bg-emerald-600',
  '商業': 'bg-violet-600',
  '心理': 'bg-rose-500',
  '歷史': 'bg-orange-700',
  '藝術': 'bg-pink-500',
  '漫畫': 'bg-cyan-500',
  '語言': 'bg-teal-600',
}

const DEFAULT_SPINE_COLOR = 'bg-slate-500'

export function getSpineColor(tags: string[] | null): string {
  if (!tags || tags.length === 0) return DEFAULT_SPINE_COLOR
  return TAG_COLORS[tags[0]] ?? DEFAULT_SPINE_COLOR
}

export const XP_RULES = {
  ADD_BOOK: 10,
  LEND_OUT: 30,
  RETURN_COMPLETE: 20,
  BOOKS_10_MILESTONE: 50,
} as const

export interface LevelDef {
  level: number
  xpRequired: number
  title: string
}

export const LEVELS: LevelDef[] = [
  { level: 1, xpRequired: 0, title: '換書新手' },
  { level: 2, xpRequired: 50, title: '書架入門' },
  { level: 3, xpRequired: 150, title: '愛書人' },
  { level: 4, xpRequired: 300, title: '書蟲' },
  { level: 5, xpRequired: 500, title: '換書達人' },
  { level: 6, xpRequired: 800, title: '藏書家' },
  { level: 7, xpRequired: 1200, title: '書癡' },
  { level: 8, xpRequired: 1800, title: '移動圖書館' },
  { level: 9, xpRequired: 2500, title: '換書傳說' },
  { level: 10, xpRequired: 3500, title: '書神' },
]

export function getLevelInfo(xp: number): { level: number; title: string; currentXp: number; nextLevelXp: number; progress: number } {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl
    else break
  }

  const nextLevel = LEVELS.find((l) => l.level === current.level + 1)
  const nextLevelXp = nextLevel?.xpRequired ?? current.xpRequired
  const xpInLevel = xp - current.xpRequired
  const xpNeeded = nextLevelXp - current.xpRequired
  const progress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1

  return {
    level: current.level,
    title: current.title,
    currentXp: xp,
    nextLevelXp,
    progress,
  }
}

export interface BadgeDef {
  id: string
  name: string
  description: string
}

export const BADGES: BadgeDef[] = [
  { id: 'first_book', name: '第一本書', description: '上架第一本書' },
  { id: 'first_swap', name: '首次換書', description: '完成第一次換出' },
  { id: 'bookworm_10', name: '十本藏書', description: '書架達 10 本' },
  { id: 'swapper_5', name: '換書小能手', description: '累計換出 5 次' },
  { id: 'swapper_20', name: '換書專家', description: '累計換出 20 次' },
  { id: 'returner', name: '有借有還', description: '完成第一次歸還' },
  { id: 'collector_30', name: '大藏家', description: '書架達 30 本' },
]
