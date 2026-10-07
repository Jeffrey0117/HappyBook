import { useEffect, useRef } from "react"
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "tiptap-markdown"
import { Bold, Italic, Quote, List, ListOrdered, Heading2, Heading3 } from "lucide-react"

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
    content: value,
    onUpdate: ({ editor }) => {
      const md = (editor.storage as any).markdown.getMarkdown()
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
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return <div className="min-h-[360px] bg-muted animate-pulse rounded-md" />

  const btn = (active: boolean) =>
    `p-1.5 rounded-md transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`

  return (
    <div className="border border-input rounded-md bg-background">
      {/* 固定工具列：區塊層級 */}
      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5 flex-wrap">
        <button type="button" title="大標題" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))}>
          <Heading2 className="w-4 h-4" />
        </button>
        <button type="button" title="小標題" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))}>
          <Heading3 className="w-4 h-4" />
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
      <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }}>
        <div className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1 py-1">
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
