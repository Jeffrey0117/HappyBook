import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import BookCard from '../BookCard'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock react-swipeable
vi.mock('react-swipeable', () => ({
  useSwipeable: () => ({}),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

const mockBook = {
  id: '1',
  title: '測試書籍',
  author: '測試作者',
  tags: ['標籤1', '標籤2'],
  progress: '閱讀中' as const,
  rating: 4,
}

describe('BookCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('應該顯示書籍基本資訊', () => {
    render(
      <TestWrapper>
        <BookCard {...mockBook} />
      </TestWrapper>
    )

    expect(screen.getByText('測試書籍')).toBeInTheDocument()
    expect(screen.getByText('測試作者')).toBeInTheDocument()
    expect(screen.getByText('閱讀中')).toBeInTheDocument()
  })

  it('應該顯示標籤', () => {
    render(
      <TestWrapper>
        <BookCard {...mockBook} />
      </TestWrapper>
    )

    expect(screen.getByText('標籤1')).toBeInTheDocument()
    expect(screen.getByText('標籤2')).toBeInTheDocument()
  })

  it('應該限制顯示最多3個標籤', () => {
    const bookWithManyTags = {
      ...mockBook,
      tags: ['標籤1', '標籤2', '標籤3', '標籤4', '標籤5'],
    }

    render(
      <TestWrapper>
        <BookCard {...bookWithManyTags} />
      </TestWrapper>
    )

    expect(screen.getByText('標籤1')).toBeInTheDocument()
    expect(screen.getByText('標籤2')).toBeInTheDocument()
    expect(screen.getByText('標籤3')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.queryByText('標籤4')).not.toBeInTheDocument()
  })

  it('應該根據進度狀態顯示不同的顏色', () => {
    const bookNotRead = { ...mockBook, progress: '未讀' as const }
    const { rerender } = render(
      <TestWrapper>
        <BookCard {...bookNotRead} />
      </TestWrapper>
    )

    expect(screen.getByText('未讀')).toHaveClass('bg-muted')

    const bookFinished = { ...mockBook, progress: '已讀' as const }
    rerender(
      <TestWrapper>
        <BookCard {...bookFinished} />
      </TestWrapper>
    )

    expect(screen.getByText('已讀')).toHaveClass('bg-primary/20')
  })

  it('應該在沒有評分時不顯示評分區域', () => {
    const bookWithoutRating = { ...mockBook, rating: undefined }
    
    const { container } = render(
      <TestWrapper>
        <BookCard {...bookWithoutRating} />
      </TestWrapper>
    )

    const starIcons = container.querySelectorAll('.lucide-star')
    expect(starIcons).toHaveLength(0)
  })
})