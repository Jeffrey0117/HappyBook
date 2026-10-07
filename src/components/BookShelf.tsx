import { useState } from 'react'
import BookSpine from './BookSpine'
import BookDetailDialog from './BookDetailDialog'
import type { Book } from '@/lib/selfize'

interface BookShelfProps {
  books: Book[]
  actions?: (book: Book) => React.ReactNode
}

const BOOKS_PER_SHELF = 6

const BookShelf = ({ books, actions }: BookShelfProps) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  const shelves: Book[][] = []
  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) {
    shelves.push(books.slice(i, i + BOOKS_PER_SHELF))
  }

  return (
    <div className="bg-slate-900 rounded-xl p-4 space-y-0">
      {shelves.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">空空的書架</p>
        </div>
      ) : (
        shelves.map((shelf, i) => (
          <div key={i}>
            <div className="flex items-end gap-1.5 px-2 pt-3 overflow-x-auto no-scrollbar">
              {shelf.map((book) =>
                book.cover_url ? (
                  <button
                    key={book.id}
                    onClick={() => setSelectedBook(book)}
                    title={book.title}
                    className="flex-1 min-w-0 max-w-24 hover:-translate-y-2 transition-transform"
                  >
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full aspect-[2/3] object-cover rounded-sm shadow-lg border border-black/30"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <BookSpine
                    key={book.id}
                    book={book}
                    onClick={() => setSelectedBook(book)}
                  />
                )
              )}
            </div>
            <div className="h-3 bg-gradient-to-b from-amber-800 to-amber-900 rounded-sm shadow-inner" />
            <div className="h-1 bg-amber-950/60" />
          </div>
        ))
      )}

      <BookDetailDialog
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        actions={selectedBook && actions ? actions(selectedBook) : undefined}
      />
    </div>
  )
}

export default BookShelf
