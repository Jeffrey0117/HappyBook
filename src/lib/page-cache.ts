/**
 * 頁面資料快取：localStorage 存上次成功載入的資料，
 * 進頁面先秒出快取內容、背景再抓最新，消滅「等待＋跳版」。
 */
const PREFIX = "hbc1_" // 換版本號可讓舊快取全部失效

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data))
  } catch {
    // 滿了或隱私模式就算了，不影響功能
  }
}
