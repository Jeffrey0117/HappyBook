import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { useAuth } from "@/hooks/use-auth"
import { BookOpen, NotebookPen, Sparkles, ArrowRight, Library } from "lucide-react"

const FEATURES = [
  {
    icon: BookOpen,
    title: "書架交換",
    desc: "上架你的書、逛別人的書櫃，看對眼就換。每一本書都找得到下一個讀者。",
  },
  {
    icon: NotebookPen,
    title: "標註筆記",
    desc: "螢光筆、底線、批註，立場／核心／正反例分類標註——讀過的每一頁都留下論證地圖。",
  },
  {
    icon: Sparkles,
    title: "AI 問書",
    desc: "你的筆記餵出你的私人閱讀顧問。問它問題，它用你讀過的書回答，句句有出處。",
  },
]

const Landing = () => {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero：黑底品牌區 */}
      <section className="bg-neutral-950 text-white">
        <div className="max-w-screen-md mx-auto px-6 pt-14 pb-16 text-center">
          <img
            src="/logo-happybook.png"
            alt="HappyBook"
            className="w-64 sm:w-80 mx-auto mb-8"
          />
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-snug">
            讀過的書，變成你的資產
          </h1>
          <p className="text-neutral-400 mb-10 leading-relaxed">
            書架交換 × 劃線批註 × AI 書庫。
            <br />
            HappyBook 讓每一本讀過的書都留下痕跡。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <>
                <Button size="lg" onClick={() => navigate("/my")} className="bg-white text-neutral-950 hover:bg-neutral-200">
                  <Library className="w-5 h-5 mr-2" />
                  進入我的書架
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/my/records")} className="border-neutral-600 bg-transparent text-white hover:bg-neutral-800 hover:text-white">
                  <NotebookPen className="w-5 h-5 mr-2" />
                  整理書單筆記
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" onClick={() => login()} className="bg-white text-neutral-950 hover:bg-neutral-200">
                  加入 HappyBook
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/browse")} className="border-neutral-600 bg-transparent text-white hover:bg-neutral-800 hover:text-white">
                  先逛逛大家的書架
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 三大功能 */}
      <section className="max-w-screen-lg mx-auto px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-card border border-border rounded-2xl p-6">
                <Icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 次要入口 */}
      <section className="max-w-screen-md mx-auto px-6 pb-14 text-center">
        <p className="text-muted-foreground mb-4">想先看看大家在讀什麼？</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to="/browse">瀏覽書籍</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/reviews">看看心得</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/wall">換書動態牆</Link>
          </Button>
        </div>
      </section>

      <footer className="text-center text-xs text-muted-foreground pb-6">
        HappyBook —— 一起把書讀厚
      </footer>

      <Navigation />
    </div>
  )
}

export default Landing
