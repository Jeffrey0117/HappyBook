import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { ArrowLeft } from "lucide-react"

const Rules = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">換書守則</h1>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">交換前</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>如實描述書況：書籍若有畫記、摺痕、汙損等情形，請誠實標示。</li>
              <li>確認交換意願：收到請求後請盡快回覆，不要讓對方等太久。</li>
              <li>約定見面細節：確認時間、地點、聯繫方式，建議選擇公共場所。</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">交換時</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>準時出現：尊重對方的時間，若臨時有變請提前告知。</li>
              <li>攜帶正確書籍：確認帶的書就是對方想要的那本。</li>
              <li>當場確認書況：收到書時檢查是否與描述相符。</li>
              <li>拍照上傳：完成交換後，拍張照片上傳作為紀錄。</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">交換後</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>上傳交換照片至平台，完成交換流程。</li>
              <li>歡迎為書寫一篇讀後心得，分享給其他讀者。</li>
              <li>如有任何問題，請直接與對方溝通協調。</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">禁止行為</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>爽約不到：約好時間地點卻不出現，且未事先告知。</li>
              <li>以次充好：書況明顯比描述差很多，蓄意欺騙。</li>
              <li>騷擾他人：利用聯絡資訊進行與換書無關的騷擾行為。</li>
              <li>商業行為：利用平台進行販售書籍等商業活動。</li>
            </ul>
          </section>

          <section className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground">
              違反以上守則者，平台保留停用帳號之權利。
              讓我們一起維護友善的換書環境！
            </p>
          </section>
        </div>
      </main>

      <Navigation />
    </div>
  )
}

export default Rules
