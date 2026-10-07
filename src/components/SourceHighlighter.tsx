import { useRef, useState, useCallback, useEffect } from "react"
import { Highlighter, Underline, Eraser, MessageSquarePlus, MessageSquare, Pencil, Trash2, X } from "lucide-react"
import type { Highlight, HighlightColor } from "@/lib/selfize"

/** 螢光筆分類：顏色＝語義。sym 會顯示在標註段落開頭的上標處 */
export const HL_CATEGORIES: Record<HighlightColor, { label: string; sym: string; mark: string; dot: string; symText: string }> = {
  y: { label: "重點", sym: "", mark: "bg-yellow-200 dark:bg-yellow-500/40", dot: "bg-yellow-400", symText: "" },
  g: { label: "正例", sym: "＋", mark: "bg-green-200 dark:bg-green-500/30", dot: "bg-green-500", symText: "text-green-600 dark:text-green-400" },
  r: { label: "反例", sym: "−", mark: "bg-red-200 dark:bg-red-500/30", dot: "bg-red-500", symText: "text-red-600 dark:text-red-400" },
  b: { label: "核心", sym: "★", mark: "bg-blue-200 dark:bg-blue-500/30", dot: "bg-blue-500", symText: "text-blue-600 dark:text-blue-400" },
  p: { label: "立場", sym: "⚑", mark: "bg-purple-200 dark:bg-purple-500/30", dot: "bg-purple-500", symText: "text-purple-600 dark:text-purple-400" },
}

interface ToolbarState {
  x: number
  y: number
  start: number
  end: number
  hasStyle: boolean
}

interface NotePanelState {
  x: number
  y: number
  start: number
  end: number
  noteId: string | null // null = 新批註
  draft: string
  mode: "view" | "edit"
}

interface SourceHighlighterProps {
  text: string
  highlights: Highlight[]
  onChange: (next: Highlight[]) => void
}

const genId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36)

/** 新的螢光筆/底線蓋掉既有同類標註的重疊部分；批註（note）是獨立圖層不受影響 */
function addStyleRange(hls: Highlight[], s: number, e: number, k: "hl" | "ul", c?: HighlightColor): Highlight[] {
  const out: Highlight[] = []
  for (const h of hls) {
    if (h.k === "note" || h.e <= s || h.s >= e) {
      out.push(h)
      continue
    }
    if (h.s < s) out.push({ ...h, e: s })
    if (h.e > e) out.push({ ...h, s: e })
  }
  out.push(c ? { s, e, k, c } : { s, e, k })
  return out.sort((a, b) => a.s - b.s)
}

/** 清除只作用於螢光筆/底線；批註由自己的面板刪除 */
function removeStyleRange(hls: Highlight[], s: number, e: number): Highlight[] {
  const out: Highlight[] = []
  for (const h of hls) {
    if (h.k === "note" || h.e <= s || h.s >= e) {
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
  hlc: HighlightColor | null
  ul: boolean
  noted: boolean
}

function buildSegments(text: string, hls: Highlight[]): Segment[] {
  const clamp = (n: number) => Math.max(0, Math.min(n, text.length))
  const points = new Set<number>([0, text.length])
  for (const h of hls) {
    points.add(clamp(h.s))
    points.add(clamp(h.e))
  }
  const sorted = [...points].sort((a, b) => a - b)
  const segs: Segment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i]
    const e = sorted[i + 1]
    if (s >= e) continue
    const hl = hls.find((h) => h.k === "hl" && h.s <= s && h.e >= e)
    segs.push({
      s,
      e,
      hlc: hl ? hl.c || "y" : null,
      ul: hls.some((h) => h.k === "ul" && h.s <= s && h.e >= e),
      noted: hls.some((h) => h.k === "note" && h.s <= s && h.e >= e),
    })
  }
  return segs
}

const SourceHighlighter = ({ text, highlights, onChange }: SourceHighlighterProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null)
  const [notePanel, setNotePanel] = useState<NotePanelState | null>(null)

  const notes = highlights.filter((h) => h.k === "note")

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
    setNotePanel(null)
    setToolbar({
      x: Math.max(12, Math.min(window.innerWidth - 12, rect.left + rect.width / 2)),
      y: Math.max(12, rect.top - 10),
      start,
      end,
      hasStyle: highlights.some((h) => h.k !== "note" && h.s < end && h.e > start),
    })
  }, [readSelection, highlights])

  const handlePointerUp = useCallback(() => {
    // 等瀏覽器把 selection 定下來再讀（行動裝置尤其需要）
    setTimeout(openToolbarFromSelection, 60)
  }, [openToolbarFromSelection])

  const applyStyle = useCallback(
    (kind: "hl" | "ul" | "erase", color?: HighlightColor) => {
      if (!toolbar) return
      const next =
        kind === "erase"
          ? removeStyleRange(highlights, toolbar.start, toolbar.end)
          : addStyleRange(highlights, toolbar.start, toolbar.end, kind, kind === "hl" ? color || "y" : undefined)
      onChange(next)
      window.getSelection()?.removeAllRanges()
      setToolbar(null)
    },
    [toolbar, highlights, onChange]
  )

  const startNewNote = useCallback(() => {
    if (!toolbar) return
    window.getSelection()?.removeAllRanges()
    setNotePanel({
      x: Math.max(160, Math.min(window.innerWidth - 160, toolbar.x)),
      y: toolbar.y + 20,
      start: toolbar.start,
      end: toolbar.end,
      noteId: null,
      draft: "",
      mode: "edit",
    })
    setToolbar(null)
  }, [toolbar])

  const openNote = useCallback((note: Highlight, x: number, y: number) => {
    setToolbar(null)
    setNotePanel({
      x: Math.max(160, Math.min(window.innerWidth - 160, x)),
      y: Math.max(12, y),
      start: note.s,
      end: note.e,
      noteId: note.id || null,
      draft: note.t || "",
      mode: "view",
    })
  }, [])

  const saveNote = useCallback(() => {
    if (!notePanel || !notePanel.draft.trim()) return
    const trimmed = notePanel.draft.trim()
    const next = notePanel.noteId
      ? highlights.map((h) => (h.id === notePanel.noteId ? { ...h, t: trimmed } : h))
      : [...highlights, { s: notePanel.start, e: notePanel.end, k: "note" as const, t: trimmed, id: genId() }]
    onChange(next.sort((a, b) => a.s - b.s))
    setNotePanel(null)
  }, [notePanel, highlights, onChange])

  const deleteNote = useCallback(() => {
    if (!notePanel?.noteId) return
    onChange(highlights.filter((h) => h.id !== notePanel.noteId))
    setNotePanel(null)
  }, [notePanel, highlights, onChange])

  const handleMarkClick = useCallback(
    (seg: Segment, event: React.MouseEvent) => {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) return // 有選取時交給選取流程
      if (seg.noted) {
        const note = notes.find((h) => h.s <= seg.s && h.e >= seg.e)
        if (note) {
          event.stopPropagation()
          openNote(note, event.clientX, event.clientY - 10)
          return
        }
      }
      if (!seg.hlc && !seg.ul) return
      event.stopPropagation()
      setNotePanel(null)
      setToolbar({
        x: Math.max(12, Math.min(window.innerWidth - 12, event.clientX)),
        y: Math.max(12, event.clientY - 10),
        start: seg.s,
        end: seg.e,
        hasStyle: true,
      })
    },
    [notes, openNote]
  )

  useEffect(() => {
    if (!toolbar) return
    const close = () => setToolbar(null)
    window.addEventListener("scroll", close, true)
    return () => window.removeEventListener("scroll", close, true)
  }, [toolbar])

  const segments = buildSegments(text, highlights)
  const clampEnd = (n: number) => Math.max(0, Math.min(n, text.length))

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
          // 分類符號：掛在螢光筆標註的起點（上標）
          const startingSyms = highlights
            .filter((h) => h.k === "hl" && h.c && HL_CATEGORIES[h.c].sym && Math.max(0, h.s) === seg.s)
            .map((h) => (
              <span
                key={`s-${h.s}-${h.e}`}
                className={`text-xs align-super font-bold select-none mr-0.5 ${HL_CATEGORIES[h.c!].symText}`}
              >
                {HL_CATEGORIES[h.c!].sym}
              </span>
            ))
          const endingNotes = notes.filter((n) => clampEnd(n.e) === seg.e)
          const markers = endingNotes.map((note) => (
            <button
              key={`m-${note.id || note.s}`}
              onClick={(e) => {
                e.stopPropagation()
                openNote(note, e.clientX, e.clientY - 10)
              }}
              className="inline-flex align-top text-primary mx-0.5 -translate-y-0.5"
              aria-label="查看批註"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-primary/20" />
            </button>
          ))
          if (!seg.hlc && !seg.ul && !seg.noted) {
            return [...startingSyms, <span key={seg.s}>{content}</span>, ...markers]
          }
          return [
            ...startingSyms,
            <mark
              key={seg.s}
              onClick={(e) => handleMarkClick(seg, e)}
              className={[
                "text-inherit cursor-pointer rounded-sm",
                seg.hlc ? HL_CATEGORIES[seg.hlc].mark : "bg-transparent",
                seg.ul
                  ? "underline decoration-primary decoration-2 underline-offset-4"
                  : seg.noted
                    ? "underline decoration-dotted decoration-primary/70 decoration-2 underline-offset-4"
                    : "",
              ].join(" ")}
            >
              {content}
            </mark>,
            ...markers,
          ]
        })}
      </div>

      {toolbar && (
        <div
          className="fixed z-[60] -translate-x-1/2 -translate-y-full flex flex-col gap-1 bg-popover border border-border rounded-lg shadow-lg px-1.5 py-1.5"
          style={{ left: toolbar.x, top: toolbar.y }}
          onMouseDown={(e) => e.preventDefault()} // 別讓點按鈕弄掉 selection
        >
          <div className="flex items-center gap-1">
            <button onClick={() => applyStyle("hl", "y")} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm hover:bg-muted">
              <Highlighter className="w-4 h-4 text-yellow-500" />
              螢光筆
            </button>
            <button onClick={() => applyStyle("ul")} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm hover:bg-muted">
              <Underline className="w-4 h-4 text-primary" />
              底線
            </button>
            <button onClick={startNewNote} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm hover:bg-muted">
              <MessageSquarePlus className="w-4 h-4 text-primary" />
              批註
            </button>
            {toolbar.hasStyle && (
              <button onClick={() => applyStyle("erase")} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted">
                <Eraser className="w-4 h-4" />
                清除
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 border-t border-border pt-1">
            {(["g", "r", "b", "p"] as HighlightColor[]).map((c) => (
              <button
                key={c}
                onClick={() => applyStyle("hl", c)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-sm hover:bg-muted"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${HL_CATEGORIES[c].dot}`} />
                {HL_CATEGORIES[c].sym}
                {HL_CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {notePanel && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setNotePanel(null)} />
          <div
            className="fixed z-[60] -translate-x-1/2 w-72 max-w-[90vw] bg-popover border border-border rounded-xl shadow-xl p-3"
            style={{ left: notePanel.x, top: notePanel.y }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground truncate pr-2">
                「{text.slice(notePanel.start, Math.min(notePanel.end, notePanel.start + 20))}
                {notePanel.end - notePanel.start > 20 ? "…" : ""}」
              </p>
              <button onClick={() => setNotePanel(null)} className="text-muted-foreground shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {notePanel.mode === "view" ? (
              <>
                <p className="text-sm whitespace-pre-line mb-3">💬 {notePanel.draft}</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setNotePanel({ ...notePanel, mode: "edit" })}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-sm hover:bg-muted"
                  >
                    <Pencil className="w-3.5 h-3.5" />編輯
                  </button>
                  <button
                    onClick={deleteNote}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-sm text-destructive hover:bg-muted"
                  >
                    <Trash2 className="w-3.5 h-3.5" />刪除
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={notePanel.draft}
                  onChange={(e) => setNotePanel({ ...notePanel, draft: e.target.value })}
                  rows={3}
                  autoFocus
                  placeholder="寫下你對這句話的想法…"
                  className="w-full text-sm rounded-md border border-input bg-background p-2 resize-none"
                />
                <div className="flex gap-2 justify-end mt-2">
                  <button onClick={() => setNotePanel(null)} className="px-3 py-1 rounded-md text-sm text-muted-foreground hover:bg-muted">
                    取消
                  </button>
                  <button
                    onClick={saveNote}
                    disabled={!notePanel.draft.trim()}
                    className="px-3 py-1 rounded-md text-sm bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    儲存
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default SourceHighlighter
