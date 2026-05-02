import { test, expect } from '@playwright/test'

test('基本導航測試', async ({ page }) => {
  await page.goto('/')
  
  // 檢查頁面標題
  await expect(page).toHaveTitle(/閱讀筆記系統/)
  
  // 檢查導航欄存在
  await expect(page.locator('nav')).toBeVisible()
  
  // 檢查導航項目
  await expect(page.locator('text=書庫')).toBeVisible()
  await expect(page.locator('text=主題')).toBeVisible()
  await expect(page.locator('text=新增')).toBeVisible()
})

test('新用戶完整流程', async ({ page }) => {
  await page.goto('/')
  
  // 如果還沒有用戶，應該重定向到認證頁面
  // 這裡假設有認證流程
  
  // 導航到新增書籍頁面
  await page.click('text=新增')
  await expect(page.url()).toContain('/add')
  
  // 填寫書籍表單（假設表單存在）
  const titleInput = page.locator('input[name="title"]')
  if (await titleInput.isVisible()) {
    await titleInput.fill('測試書籍')
    
    const authorInput = page.locator('input[name="author"]')
    await authorInput.fill('測試作者')
    
    // 提交表單
    await page.click('button[type="submit"]')
    
    // 驗證重定向到書籍詳情頁
    await expect(page.url()).toMatch(/\/book\/.*/)
  }
})

test('響應式設計測試', async ({ page }) => {
  // 測試桌面版本
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/')
  
  // 檢查導航欄在桌面上的顯示
  const nav = page.locator('nav')
  await expect(nav).toBeVisible()
  
  // 測試手機版本
  await page.setViewportSize({ width: 375, height: 667 })
  await page.reload()
  
  // 檢查導航欄在手機上仍然可見並且位於底部
  await expect(nav).toBeVisible()
  await expect(nav).toHaveClass(/fixed.*bottom-0/)
})

test('觸控友善性測試', async ({ page }) => {
  // 設定手機視窗大小
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  
  // 檢查所有按鈕都有適當的觸控區域大小
  const buttons = page.locator('button, a[role="button"]')
  const count = await buttons.count()
  
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i)
    if (await button.isVisible()) {
      const box = await button.boundingBox()
      if (box) {
        // 檢查最小觸控區域 44x44px
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  }
})

test('性能測試', async ({ page }) => {
  // 測量首次載入時間
  const startTime = Date.now()
  await page.goto('/')
  
  // 等待主要內容載入
  await page.waitForLoadState('networkidle')
  const loadTime = Date.now() - startTime
  
  // 驗證載入時間小於1.5秒
  expect(loadTime).toBeLessThan(1500)
  
  // 檢查是否有控制台錯誤
  const messages: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      messages.push(msg.text())
    }
  })
  
  await page.reload()
  expect(messages).toHaveLength(0)
})