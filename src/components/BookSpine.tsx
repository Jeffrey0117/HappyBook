import { cn } from '@/lib/utils'
import { getSpineColor } from '@/lib/game-config'
import type { Book } from '@/lib/selfize'

interface BookSpineProps {
  book: Book
  onClick?: () => void
}

const BookSpine = ({ book, onClick }: BookSpineProps) => {
  const bgColor = getSpineColor(book.tags)
  const isLentOut = book.status === 'lent_out'

  const titleLength = book.title.length
  const height = titleLength <= 4 ? 160 : titleLength <= 8 ? 180 : titleLength <= 12 ? 200 : 220

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center rounded-sm cursor-pointer transition-all duration-200',
        'hover:translate-y-[-4px] hover:shadow-lg active:translate-y-0',
        'border-r border-black/20',
        bgColor,
        isLentOut && 'opacity-50',
      )}
      style={{
        width: `${Math.max(50, Math.min(70, 40 + titleLength * 2))}px`,
        height: `${height}px`,
      }}
    >
      <span
        className="text-white font-bold text-sm leading-tight px-1 select-none drop-shadow-sm"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          maxHeight: `${height - 20}px`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {book.title}
      </span>

      {isLentOut && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-black/60 text-white px-1 rounded whitespace-nowrap">
          換出中
        </span>
      )}
    </button>
  )
}

export default BookSpine
