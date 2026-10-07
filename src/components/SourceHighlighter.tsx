import { useRef, useState, useCallback, useEffect } from "react"
import { Highlighter, Underline, Eraser } from "lucide-react"
import type { Highlight } from "@/lib/selfize"

interface ToolbarState {
  x: number
  y: number
  start: number
  end: number
  hasExisting: boolean
}

interface SourceHighlighterProps {
  text: string
  highlights: Highlight[]
  onChange: (next: Highlight[]) => void
}

/** 新區間蓋掉既有標註的重疊部分（既有的被切成不重疊的殘段），維持不可變 */
function addRange(hls: Highlight[], s: number, e: number, k: Highlight["k"]): Highlight[] {
  const out: Highlight[] = []
  for (const h of hls) {
    if (h.e <= s || h.s >= e) {
      out.push(h)
      continue
    }
    if (h.s < s) out.push({ ...h, e: s })
    if (h.e > e) out.push({ ...h, s: e })
  }
  out.push({ s, e, k })
  return out.sort((a, b) => a.s - b.s)
}

function removeRange(hls: Highlight[], s: number, e: number): Highlight[] {
  const out: Highlight[] = []
  for (const h of hls) {
    if (h.e <= s || h.s >= e) {
      out.push(h)
      continue
    }
    if (h.s < s) out.push({ ...h, e: s })
    if (h.e > e) out.push({ ...h, s: e })
  }
  return out.sort((a, b) => a.s - b.s)
}

interface Segment {
  s: number
  e: number
  hl: boolean
  ul: boolean
}

function buildSegments(text: string, hls: Highlight[]): Segment[] {
  const points = new Set<number>([0, text.length])
  for (const h of hls) {
    points.add(Math.max(0, Math.min(h.s, text.length)))
    points.add(Math.max(0, Math.min(h.e, text.length)))
  }
  const sorted = [...points].sort((a, b) => a - b)
  const segs: Segment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i]
    const e = sorted[i + 1]
    if (s >= e) continue
    segs.push({
      s,
      e,
      hl: hls.some((h) => h.k === "hl" && h.s <= s && h.e >= e),
      ul: hls.some((h) => h.k === "ul" && h.s <= s && h.e >= e),
    })
  }
  return segs
}

const SourceHighlighter = ({ text, highlights, onChange }: SourceHighlighterProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null)

  const readSelection = useCallback(() => {
    const container = containerRef.current
    const sel = window.getSelection()
    if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) return null
    const range = sel.getRangeAt(0)
    if (!container.contains(range.commonAncestorContainer)) return null
    const pre = range.cloneRange()
    pre.selectNodeContents(container)
    pre.setEnd(range.startContainer, range.startOffset)
    const start = pre.toString().length
    const len = range.toString().length
    if (len === 0) return null
    return { start, end: start + len, rect: range.getBoundingClientRect() }
  }, [])

  const openToolbarFromSelection = useCallback(() => {
    const found = readSelection()
    if (!found) return
    const { start, end, rect } = found
    setToolbar({
      x: Math.max(12, Math.min(window.innerWidth - 12, rect.left + rect.width / 2)),
      y: Math.max(12, rect.top - 10),
      start,
      end,
      hasExisting: highlights.some((h) => h.s < end && h.e > start),
    })
  }, [readSelection, highlights])

  const handlePointerUp = useCallback(() => {
    // 等瀏覽器把 selection 定下來再讀（行動裝置尤其需要）
    setTimeout(openToolbarFromSelection, 60)
  }, [openToolbarFromSelection])

  const handleMarkClick = useCallback(
    (seg: Segment, event: React.MouseEvent) => {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) return // 有選取時交給選取流程
      if (!seg.hl && !seg.ul) return
      event.stopPropagation()
      setToolbar({
        x: Math.max(12, Math.min(window.innerWidth - 12, event.clientX)),
        y: Math.max(12, event.clientY - 10),
        start: seg.s,
        end: seg.e,
        hasExisting: true,
      })
    },
    []
  )

  const apply = useCallback(
    (kind: Highlight["k"] | "erase") => {
      if (!toolbar) return
      const next =
        kind === "erase"
          ? removeRange(highlights, toolbar.start, toolbar.end)
          : addRange(highlights, toolbar.start, toolbar.end, kind)
      onChange(next)
      window.getSelection()?.removeAllRanges()
      setToolbar(null)
    },
    [toolbar, highlights, onChange]
  )

  // 點標註工具列以外的地方就關掉
  useEffect(() => {
    if (!toolbar) return
    const close = () => setToolbar(null)
    window.addEventListener("scroll", close, true)
    return () => window.removeEventListener("scroll", close, true)
  }, [toolbar])

  const segments = buildSegments(text, highlights)

  return (
    <>
      <div
        ref={containerRef}
        className="text-[15px] leading-7 whitespace-pre-line select-text"
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
      >
        {segments.map((seg) => {
          const content = text.slice(seg.s, seg.e)
          if (!seg.hl && !seg.ul) return <span key={seg.s}>{content}</span>
          return (
            <mark
              key={seg.s}
              onClick={(e) => handleMarkClick(seg, e)}
              className={[
                "text-inherit cursor-pointer rounded-sm",
                seg.hl ? "bg-yellow-200 dark:bg-yellow-500/40" : "bg-transparent",
                seg.ul ? "underline decoration-primary decoration-2 underline-offset-4" : "",
              ].join(" ")}
            >
              {content}
            </mark>
          )
        })}
      </div>

      {toolbar && (
        <div
          className="fixed z-[60] -translate-x-1/2 -translate-y-full flex items-center gap-1 bg-popover border border-border rounded-lg shadow-lg px-1.5 py-1"
          style={{ left: toolbar.x, top: toolbar.y }}
          onMouseDown={(e) => e.preventDefault()} // 別讓點按鈕弄掉 selection
        >
          <button
            onClick={() => apply("hl")}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm hover:bg-muted"
          >
            <Highlighter className="w-4 h-4 text-yellow-500" />
            螢光筆
          </button>
          <button
            onClick={() => apply("ul")}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm hover:bg-muted"
          >
            <Underline className="w-4 h-4 text-primary" />
            底線
          </button>
          {toolbar.hasExisting && (
            <button
              onClick={() => apply("erase")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted"
            >
              <Eraser className="w-4 h-4" />
              清除
            </button>
          )}
        </div>
      )}
    </>
  )
}

export default SourceHighlighter
