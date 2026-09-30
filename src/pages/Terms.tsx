import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { ArrowLeft } from "lucide-react"

const Terms = () => {
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
            <h1 className="text-xl font-bold">使用條款</h1>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">服務說明</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              「換書不可」（以下稱本平台）提供使用者進行二手書交換的媒合服務。
              本平台僅作為資訊媒介，不對使用者間之交易行為、書籍品質或交換結果負任何法律責任。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">使用者責任</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>使用者應確保所上架書籍為合法擁有之書籍，不得上架盜版或非法取得之書籍。</li>
              <li>書況描述應如實填寫，不得故意隱瞞書籍損壞情形。</li>
              <li>使用者應自行承擔交換過程中之人身安全與財物風險。</li>
              <li>禁止利用本平台從事任何違法行為或商業營利活動。</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">免責聲明</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>本平台不保證媒合一定成功，亦不對交換雙方之行為負責。</li>
              <li>因使用本服務所衍生之任何糾紛，由當事人自行協調處理。</li>
              <li>本平台保留隨時修改或中止服務之權利，恕不另行通知。</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">隱私保護</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              本平台僅蒐集提供服務所必要之個人資料（如顯示名稱、聯絡方式）。
              您的聯絡資訊僅在雙方同意交換後才會向對方揭露。
              本平台不會將您的個人資料提供給第三方。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">帳號管理</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              使用者應妥善保管帳號資訊。如發現帳號遭他人冒用，請立即通知本平台。
              本平台保留因違反規定而停用帳號之權利。
            </p>
          </section>
        </div>
      </main>

      <Navigation />
    </div>
  )
}

export default Terms
