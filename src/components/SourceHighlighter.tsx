import { useRef, useState, useCallback, useEffect } from "react"
import { Highlighter, Underline, Eraser, MessageSquarePlus, MessageSquare, Pencil, Trash2, X, List, ChevronDown, ChevronUp, Send } from "lucide-react"
import type { Highlight, HighlightColor } from "@/lib/selfize"

/**
 * 螢光筆分類：顏色＝語義。sym 用在工具列按鈕文字；
 * symClass 用 CSS 偽元素把符號畫在標註開頭——不能用真實文字節點，
 * 否則符號會被算進 Range.toString() 的選取座標，之後所有標註位置全部偏移。
 */
export const HL_CATEGORIES: Record<HighlightColor, { label: string; sym: string; mark: string; dot: string; symClass: string }> = {
  y: { label: "重點", sym: "", mark: "bg-yellow-200 dark:bg-yellow-500/40", dot: "bg-yellow-400", symClass: "" },
  g: { label: "正例", sym: "＋", mark: "bg-green-200 dark:bg-green-500/30", dot: "bg-green-500", symClass: "before:content-['＋'] bg-green-100 text-green-700 ring-1 ring-green-500/60 dark:bg-green-900/60 dark:text-green-300" },
  r: { label: "反例", sym: "−", mark: "bg-red-200 dark:bg-red-500/30", dot: "bg-red-500", symClass: "before:content-['−'] bg-red-100 text-red-700 ring-1 ring-red-500/60 dark:bg-red-900/60 dark:text-red-300" },
  b: { label: "核心", sym: "★", mark: "bg-blue-200 dark:bg-blue-500/30", dot: "bg-blue-500", symClass: "before:content-['★'] bg-blue-100 text-blue-700 ring-1 ring-blue-500/60 dark:bg-blue-900/60 dark:text-blue-300" },
  p: { label: "立場", sym: "⚑", mark: "bg-purple-200 dark:bg-purple-500/30", dot: "bg-purple-500", symClass: "before:content-['⚑'] bg-purple-100 text-purple-700 ring-1 ring-purple-500/60 dark:bg-purple-900/60 dark:text-purple-300" },
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
  /** 展演模式：false = 隱藏所有標註與目錄、停用標註互動，只留排版後的乾淨原文 */
  showMarks?: boolean
  /** 選取／點標註 → 把這句發成動態貼文（由宿主開發文視窗） */
  onShareQuote?: (quote: { text: string; c: HighlightColor }) => void
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
  out.sort((a, b) => a.s - b.s)

  // 同分類「重疊或緊鄰」自動合併成一條 → 重畫同色＝延伸區間，不會斷成兩段
  const merged: Highlight[] = []
  for (const h of out) {
    const last = merged[merged.length - 1]
    if (
      last &&
      h.k !== "note" &&
      last.k === h.k &&
      (last.c || "y") === (h.c || "y") &&
      h.s <= last.e
    ) {
      merged[merged.length - 1] = { ...last, e: Math.max(last.e, h.e) }
    } else {
      merged.push(h)
    }
  }
  return merged
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
  mdCls: string
}

/**
 * 輕量 Markdown 行樣式（# 標題、> 引言）。
 * 記號字元必須留在 DOM（用 font-size:0 隱藏）——拿掉會讓選取座標跟 source_text 對不上。
 */
interface LineStyle {
  s: number
  e: number
  markerEnd: number
  cls: string
}

const MD_MARKER_CLS = "text-[0px] select-none"

function parseLineStyles(text: string): LineStyle[] {
  const out: LineStyle[] = []
  let pos = 0
  for (const line of text.split("\n")) {
    let m: RegExpExecArray | null
    if ((m = /^(#{1,3})\s+/.exec(line))) {
      const level = m[1].length
      out.push({
        s: pos,
        e: pos + line.length,
        markerEnd: pos + m[0].length,
        cls: level === 1 ? "text-xl font-bold" : level === 2 ? "text-lg font-bold" : "text-base font-bold",
      })
    } else if ((m = /^>\s?/.exec(line))) {
      out.push({ s: pos, e: pos + line.length, markerEnd: pos + m[0].length, cls: "italic text-muted-foreground" })
    }
    pos += line.length + 1
  }
  return out
}

function buildSegments(text: string, hls: Highlight[], lineStyles: LineStyle[]): Segment[] {
  const clamp = (n: number) => Math.max(0, Math.min(n, text.length))
  const points = new Set<number>([0, text.length])
  for (const h of hls) {
    points.add(clamp(h.s))
    points.add(clamp(h.e))
  }
  for (const ls of lineStyles) {
    points.add(ls.s)
    points.add(ls.markerEnd)
    points.add(ls.e)
  }
  const sorted = [...points].sort((a, b) => a - b)
  const segs: Segment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i]
    const e = sorted[i + 1]
    if (s >= e) continue
    const hl = hls.find((h) => h.k === "hl" && h.s <= s && h.e >= e)
    const ls = lineStyles.find((l) => l.s <= s && e <= l.e)
    segs.push({
      s,
      e,
      hlc: hl ? hl.c || "y" : null,
      ul: hls.some((h) => h.k === "ul" && h.s <= s && h.e >= e),
      noted: hls.some((h) => h.k === "note" && h.s <= s && h.e >= e),
      mdCls: ls ? (s < ls.markerEnd ? MD_MARKER_CLS : ls.cls) : "",
    })
  }
  return segs
}

const SourceHighlighter = ({ text, highlights: realHighlights, onChange, showMarks = true, onShareQuote }: SourceHighlighterProps) => {
  // 展演模式下用空陣列渲染（乾淨原文），但 onChange 永遠以真實資料為基底，避免覆寫
  const highlights = showMarks ? realHighlights : []
  const containerRef = useRef<HTMLDivElement>(null)
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null)
  const [notePanel, setNotePanel] = useState<NotePanelState | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [outlineSecOpen, setOutlineSecOpen] = useState<{ ul: boolean; note: boolean }>({ ul: false, note: false })

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
    // 工具列寬約 300px，置中位移要預留半寬，否則手機上會切出畫面外
    const half = Math.min(160, window.innerWidth / 2 - 6)
    setToolbar({
      x: Math.max(half, Math.min(window.innerWidth - half, rect.left + rect.width / 2)),
      y: Math.max(12, rect.top - 10),
      start,
      end,
      hasStyle: highlights.some((h) => h.k !== "note" && h.s < end && h.e > start),
    })
  }, [readSelection, highlights])

  const handlePointerUp = useCallback(() => {
    if (!showMarks) return // 展演模式不開標註工具
    // 等瀏覽器把 selection 定下來再讀（行動裝置尤其需要）
    setTimeout(openToolbarFromSelection, 60)
  }, [openToolbarFromSelection, showMarks])

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

  const shareQuote = useCallback(() => {
    if (!toolbar || !onShareQuote) return
    const covering = highlights.find((h) => h.k === "hl" && h.s < toolbar.end && h.e > toolbar.start)
    const quoteText = text.slice(Math.max(0, toolbar.start), Math.min(text.length, toolbar.end)).trim().slice(0, 160)
    if (!quoteText) return
    onShareQuote({ text: quoteText, c: covering?.c || "y" })
    window.getSelection()?.removeAllRanges()
    setToolbar(null)
  }, [toolbar, onShareQuote, highlights, text])

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
      // 鎖定「整條」涵蓋這個片段的標註，清除才不會只清到點到的碎片
      const covering = highlights.filter((h) => h.k !== "note" && h.s <= seg.s && h.e >= seg.e)
      const start = Math.min(seg.s, ...covering.map((h) => h.s))
      const end = Math.max(seg.e, ...covering.map((h) => h.e))
      const half = Math.min(160, window.innerWidth / 2 - 6)
      setToolbar({
        x: Math.max(half, Math.min(window.innerWidth - half, event.clientX)),
        y: Math.max(12, event.clientY - 10),
        start,
        end,
        hasStyle: true,
      })
    },
    [notes, openNote, highlights]
  )

  useEffect(() => {
    if (!toolbar) return
    const close = () => setToolbar(null)
    window.addEventListener("scroll", close, true)
    return () => window.removeEventListener("scroll", close, true)
  }, [toolbar])

  const lineStyles = parseLineStyles(text)
  const segments = buildSegments(text, highlights, lineStyles)
  const clampEnd = (n: number) => Math.max(0, Math.min(n, text.length))

  // 標註目錄：語義分類分組（核心→重點→立場→正例→反例＝這篇的論證地圖）；
  // 底線/批註性質不同，降級為分隔線下的折疊區（預設收合、只顯示計數）
  const OUTLINE_ORDER: HighlightColor[] = ["p", "b", "y", "g", "r"]
  const catGroups = OUTLINE_ORDER.map((c) => ({
    c,
    items: highlights.filter((h) => h.k === "hl" && (h.c || "y") === c).sort((a, b) => a.s - b.s),
  })).filter((g) => g.items.length > 0)
  const ulItems = highlights.filter((h) => h.k === "ul").sort((a, b) => a.s - b.s)
  const noteItems = [...notes].sort((a, b) => a.s - b.s)
  const outlineCount = highlights.length

  const jumpTo = (pos: number) => {
    document.getElementById(`annpos-${pos}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    setOutlineOpen(false)
  }

  const excerptOf = (h: Highlight) => text.slice(Math.max(0, h.s), Math.min(text.length, h.s + 24))
  const itemBtn = (h: Highlight, body: string) => (
    <button
      key={h.id || `${h.k}-${h.s}-${h.e}`}
      onClick={() => jumpTo(Math.max(0, Math.min(h.s, text.length)))}
      className="w-full text-left px-2 py-1 rounded-md hover:bg-muted text-xs"
    >
      <span className="line-clamp-2 break-all">{body}</span>
    </button>
  )

  const outlinePanel = (
    <>
      {catGroups.map((g) => (
        <div key={g.c}>
          <p className="flex items-center gap-1.5 px-2 pt-2 pb-0.5 text-xs font-medium">
            <span className={`w-2.5 h-2.5 rounded-full ${HL_CATEGORIES[g.c].dot}`} />
            {HL_CATEGORIES[g.c].label}（{g.items.length}）
          </p>
          {g.items.map((h) => itemBtn(h, excerptOf(h)))}
        </div>
      ))}
      {(ulItems.length > 0 || noteItems.length > 0) && catGroups.length > 0 && (
        <div className="border-t border-border mt-2" />
      )}
      {ulItems.length > 0 && (
        <div>
          <button
            onClick={() => setOutlineSecOpen((p) => ({ ...p, ul: !p.ul }))}
            className="w-full flex items-center gap-1 px-2 pt-2 pb-0.5 text-xs text-muted-foreground"
          >
            {outlineSecOpen.ul ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            底線（{ulItems.length}）
          </button>
          {outlineSecOpen.ul && ulItems.map((h) => itemBtn(h, excerptOf(h)))}
        </div>
      )}
      {noteItems.length > 0 && (
        <div>
          <button
            onClick={() => setOutlineSecOpen((p) => ({ ...p, note: !p.note }))}
            className="w-full flex items-center gap-1 px-2 pt-2 pb-0.5 text-xs text-muted-foreground"
          >
            {outlineSecOpen.note ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <MessageSquare className="w-3 h-3" />
            批註（{noteItems.length}）
          </button>
          {outlineSecOpen.note && noteItems.map((h) => itemBtn(h, h.t || ""))}
        </div>
      )}
    </>
  )

  return (
    <>
      {outlineCount > 0 && (
        <div className="xl:hidden mb-2">
          <button onClick={() => setOutlineOpen(!outlineOpen)} className="flex items-center gap-1 text-sm text-primary">
            <List className="w-4 h-4" />
            標註目錄（{outlineCount}）
            {outlineOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {outlineOpen && <div className="mt-1 border border-border rounded-lg p-1 pb-2">{outlinePanel}</div>}
        </div>
      )}
      {outlineCount > 0 && (
        <div className="hidden xl:block fixed right-6 top-28 w-60 max-h-[65vh] overflow-y-auto bg-card border border-border rounded-xl p-2 shadow-sm z-40">
          <p className="text-xs font-medium text-muted-foreground px-2 pb-1 flex items-center gap-1">
            <List className="w-3.5 h-3.5" />標註目錄
          </p>
          {outlinePanel}
        </div>
      )}
      <div
        ref={containerRef}
        className="text-[15px] leading-7 whitespace-pre-line select-text"
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
      >
        {segments.map((seg) => {
          const content = text.slice(seg.s, seg.e)
          // 分類符號：掛在螢光筆標註的起點（上標）。
          // 偽元素渲染（span 無文字子節點）→ 不影響選取座標計算
          const startingSyms = highlights
            .filter((h) => h.k === "hl" && h.c && HL_CATEGORIES[h.c].symClass && Math.max(0, h.s) === seg.s)
            .map((h) => (
              <span
                key={`s-${h.s}-${h.e}`}
                aria-hidden
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold align-super -translate-y-1 mr-0.5 select-none ${HL_CATEGORIES[h.c!].symClass}`}
              />
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
            return [...startingSyms, <span key={seg.s} id={`annpos-${seg.s}`} className={seg.mdCls}>{content}</span>, ...markers]
          }
          return [
            ...startingSyms,
            <mark
              key={seg.s}
              id={`annpos-${seg.s}`}
              onClick={(e) => handleMarkClick(seg, e)}
              className={[
                "text-inherit cursor-pointer rounded-sm",
                seg.mdCls,
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
          className="fixed z-[60] -translate-x-1/2 -translate-y-full flex flex-col gap-1 bg-popover border border-border rounded-lg shadow-lg px-1.5 py-1.5 max-w-[96vw]"
          style={{ left: toolbar.x, top: toolbar.y }}
          onMouseDown={(e) => e.preventDefault()} // 別讓點按鈕弄掉 selection
        >
          <div className="flex items-center gap-1 flex-wrap">
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
            {onShareQuote && (
              <button onClick={shareQuote} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm hover:bg-muted">
                <Send className="w-4 h-4 text-primary" />
                貼文
              </button>
            )}
            {toolbar.hasStyle && (
              <button onClick={() => applyStyle("erase")} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted">
                <Eraser className="w-4 h-4" />
                清除
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap border-t border-border pt-1">
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
