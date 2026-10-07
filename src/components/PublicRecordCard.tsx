import { MessageSquare, Sparkles } from "lucide-react"
import { HL_CATEGORIES } from "@/components/SourceHighlighter"
import type { HighlightColor } from "@/lib/selfize"

export interface PublicQuote {
  k: "hl" | "ul"
  c: HighlightColor
  text: string
}

export interface PublicNote {
  text: string
  note: string
}

export interface PublicRecord {
  id: string
  book_id: string
  user?: string
  chapter: string
  pages: string
  ai_summary: string
  my_note: string
  topic_tags: string[]
  created_at: string
  quotes: PublicQuote[]
  notes: PublicNote[]
}

const CATEGORY_ORDER: HighlightColor[] = ["p", "b", "y", "g", "r"]

/** 公開筆記的「引句＋批註」內容（不含外框與擁有者資訊，由呼叫端包） */
const PublicRecordCard = ({ record }: { record: PublicRecord }) => {
  return (
    <>
      {record.topic_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {record.topic_tags.map((t) => (
            <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}

      {record.ai_summary ? (
        <div className="mt-3 text-sm bg-muted/60 rounded-lg p-3 whitespace-pre-line">
          <p className="font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> 重點整理</p>
          {record.ai_summary}
        </div>
      ) : null}

      {record.my_note ? (
        <p className="text-sm mt-3 border-l-2 border-primary pl-2 whitespace-pre-line">💭 {record.my_note}</p>
      ) : null}

      {CATEGORY_ORDER.map((c) => {
        const qs = record.quotes.filter((q) => q.k === "hl" && q.c === c)
        if (qs.length === 0) return null
        return (
          <div key={c} className="mt-3">
            <p className="text-xs font-medium flex items-center gap-1.5 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${HL_CATEGORIES[c].dot}`} />
              {HL_CATEGORIES[c].label}
            </p>
            {qs.map((q, i) => (
              <blockquote key={i} className={`text-sm rounded-md px-3 py-2 mb-1.5 ${HL_CATEGORIES[c].mark}`}>
                {q.text}
              </blockquote>
            ))}
          </div>
        )
      })}

      {record.quotes.some((q) => q.k === "ul") && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">底線</p>
          {record.quotes.filter((q) => q.k === "ul").map((q, i) => (
            <blockquote key={i} className="text-sm border-l-2 border-foreground/30 pl-3 py-1 mb-1.5">
              {q.text}
            </blockquote>
          ))}
        </div>
      )}

      {record.notes.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground mb-1">
            <MessageSquare className="w-3.5 h-3.5" />批註
          </p>
          {record.notes.map((n, i) => (
            <div key={i} className="mb-2">
              {n.text ? (
                <p className="text-xs text-muted-foreground line-clamp-2">「{n.text}」</p>
              ) : null}
              <p className="text-sm border-l-2 border-primary pl-2 mt-0.5 whitespace-pre-line">💬 {n.note}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default PublicRecordCard
