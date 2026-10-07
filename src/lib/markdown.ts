/**
 * 心得 Markdown 預處理：
 * 1. 連續空行照實保留（Markdown 原生會把多個空行壓成一個分段，
 *    這裡把多出來的空行換成 nbsp 空段落，排版跟著使用者打的來）
 * 2. 單次換行也換行（預設要兩個空白結尾才斷行）
 */
const NBSP = String.fromCharCode(160)

/** 進富文本編輯器前：多餘空行 → nbsp 空段落（TipTap 解析不會吞掉，編輯器裡看得到空行） */
export function mdToEditor(md: string): string {
  return md.replace(/\n{3,}/g, (m) => "\n\n" + (NBSP + "\n\n").repeat(m.length - 2))
}

/** 從富文本編輯器出來：反斜線硬斷行正規化 + nbsp 空段落還原成多餘空行 */
export function mdFromEditor(md: string): string {
  return md
    .replace(/\\\n/g, "\n")
    .replace(new RegExp("\\n\\n(?:" + NBSP + "|&nbsp;)(?=\\n|$)", "g"), "\n")
}

export function mdPreserveBreaks(md: string): string {
  return md
    .replace(/\\\n/g, "\n") // TipTap 序列化的反斜線硬斷行 → 一般換行（避免跟兩空格斷行打架變成字面 \）
    .replace(/\n{3,}/g, (m) => "\n\n" + (NBSP + "\n\n").repeat(m.length - 2))
    .replace(/\n/g, "  \n")
}
