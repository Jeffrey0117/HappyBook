import { Link } from "react-router-dom"

const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30 py-6 mb-20">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">
            使用條款
          </Link>
          <span className="text-border">|</span>
          <Link to="/rules" className="hover:text-foreground transition-colors">
            換書守則
          </Link>
          <span className="text-border">|</span>
          <Link to="/wall" className="hover:text-foreground transition-colors">
            換書牆
          </Link>
          <span className="text-border">|</span>
          <Link to="/reviews" className="hover:text-foreground transition-colors">
            讀書心得
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
