import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import Navigation from '../Navigation'

const TestWrapper = ({ children, initialEntries = ['/'] }: { 
  children: React.ReactNode
  initialEntries?: string[]
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children}
  </MemoryRouter>
)

describe('Navigation', () => {
  it('應該顯示所有導航項目', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    expect(screen.getByText('書庫')).toBeInTheDocument()
    expect(screen.getByText('主題')).toBeInTheDocument()
    expect(screen.getByText('新增')).toBeInTheDocument()
  })

  it('應該正確顯示當前頁面的活動狀態', () => {
    render(
      <TestWrapper initialEntries={['/']}>
        <Navigation />
      </TestWrapper>
    )

    const homeLink = screen.getByRole('link', { name: /書庫/i })
    expect(homeLink).toHaveClass('text-primary')
  })

  it('應該正確顯示主題頁面的活動狀態', () => {
    render(
      <TestWrapper initialEntries={['/theme']}>
        <Navigation />
      </TestWrapper>
    )

    const themeLink = screen.getByRole('link', { name: /主題/i })
    expect(themeLink).toHaveClass('text-primary')
  })

  it('應該正確顯示新增頁面的活動狀態', () => {
    render(
      <TestWrapper initialEntries={['/add']}>
        <Navigation />
      </TestWrapper>
    )

    const addLink = screen.getByRole('link', { name: /新增/i })
    expect(addLink).toHaveClass('text-primary')
  })

  it('應該有正確的連結路徑', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    expect(screen.getByRole('link', { name: /書庫/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /主題/i })).toHaveAttribute('href', '/theme')
    expect(screen.getByRole('link', { name: /新增/i })).toHaveAttribute('href', '/add')
  })

  it('應該具有固定在底部的樣式', () => {
    const { container } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('fixed', 'bottom-0')
  })

  it('應該有適當的觸控區域大小', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const links = screen.getAllByRole('link')
    links.forEach(link => {
      expect(link).toHaveClass('min-h-[44px]', 'min-w-[44px]')
    })
  })
})