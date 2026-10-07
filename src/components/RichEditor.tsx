import { useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "tiptap-markdown"
import { Bold, Italic, Quote, List, ListOrdered } from "lucide-react"
import { mdToEditor, mdFromEditor } from "@/lib/markdown"

interface RichEditorProps {
  value: string
  onChange: (md: string) => void
  placeholder?: string
}

/** Medium 式所見即所得編輯器：畫面上直接排版，底層進出都是 Markdown */
const RichEditor = ({ value, onChange, placeholder }: RichEditorProps) => {
  const internalMd = useRef(value)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || "開始寫…" }),
      Markdown.configure({ breaks: true }),
    ],
    content: mdToEditor(value),
    onUpdate: ({ editor }) => {
      // 正規化硬斷行＋還原多餘空行，存進 DB 的 Markdown 跟使用者打的一致
      const md = mdFromEditor((editor.storage as any).markdown.getMarkdown())
      internalMd.current = md
      onChange(md)
    },
    editorProps: {
      attributes: {
        class: "prose-review min-h-[320px] px-4 py-3 focus:outline-none",
      },
    },
  })

  // 外部內容變更（載入既有心得、AI 草稿）時同步進編輯器
  useEffect(() => {
    if (!editor) return
    if (value !== internalMd.current && !editor.isFocused) {
      internalMd.current = value
      editor.commands.setContent(mdToEditor(value))
    }
  }, [value, editor])

  if (!editor) return <div className="min-h-[360px] bg-muted animate-pulse rounded-md" />

  const btn = (active: boolean) =>
    `p-1.5 rounded-md transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`

  /**
   * 字級只作用在「選到的那一行」：段落裡有軟換行時，
   * 先把選取行前後的換行切成段落邊界，再 toggle 標題，
   * 不然整個段落會一起變大。
   */
  const toggleLineHeading = (level: 2 | 3) => {
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const { $from, $to } = state.selection
        if ($from.parent !== $to.parent) return true
        const parent = $from.parent
        if (parent.type.name !== "paragraph") return true
        const start = $from.start()
        let prevBr = -1
        let nextBr = -1
        parent.forEach((node, offset) => {
          const pos = start + offset
          if (node.type.name === "hardBreak") {
            if (pos + 1 <= $from.pos && pos > prevBr) prevBr = pos
            if (pos >= $to.pos && nextBr === -1) nextBr = pos
          }
        })
        // 先切後面的（位置才不會被前面的操作位移）
        if (nextBr !== -1) {
          tr.delete(nextBr, nextBr + 1)
          tr.split(nextBr)
        }
        if (prevBr !== -1) {
          tr.delete(prevBr, prevBr + 1)
          tr.split(prevBr)
        }
        return true
      })
      .toggleHeading({ level })
      .run()
  }

  const BigT = <span className="font-bold text-base leading-none">T</span>
  const SmallT = <span className="font-bold text-[11px] leading-none">T</span>

  return (
    <div className="border border-input rounded-md bg-background">
      {/* 固定工具列：區塊層級 */}
      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5 flex-wrap">
        <button type="button" title="大字" onClick={() => toggleLineHeading(2)} className={`${btn(editor.isActive("heading", { level: 2 }))} w-8 h-8 flex items-center justify-center`}>
          {BigT}
        </button>
        <button type="button" title="小字" onClick={() => toggleLineHeading(3)} className={`${btn(editor.isActive("heading", { level: 3 }))} w-8 h-8 flex items-center justify-center`}>
          {SmallT}
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" title="粗體" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}>
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" title="斜體" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}>
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" title="引用" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))}>
          <Quote className="w-4 h-4" />
        </button>
        <button type="button" title="項目列表" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>
          <List className="w-4 h-4" />
        </button>
        <button type="button" title="編號列表" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      {/* Medium 式選取浮動工具列 */}
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1 py-1">
          <button type="button" title="大字" onClick={() => toggleLineHeading(2)} className={`${btn(editor.isActive("heading", { level: 2 }))} w-8 h-8 flex items-center justify-center`}>
            {BigT}
          </button>
          <button type="button" title="小字" onClick={() => toggleLineHeading(3)} className={`${btn(editor.isActive("heading", { level: 3 }))} w-8 h-8 flex items-center justify-center`}>
            {SmallT}
          </button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}>
            <Bold className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}>
            <Italic className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))}>
            <Quote className="w-4 h-4" />
          </button>
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} />
    </div>
  )
}

export default RichEditor
