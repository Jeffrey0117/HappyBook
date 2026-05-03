# HappyBook Gamification + Book Spine Shelf Design

## Goal

重新設計 HappyBook 的書架展示和換書體驗：書脊書架視覺、手機拍照上傳封面、暫時換書狀態追蹤、完整遊戲化系統（XP/等級/徽章）。

## Architecture

React SPA（既有），Supabase DB，圖片上傳走 Upimg (duk.tw)。新增 gamification 邏輯全在前端計算（基於 swap 記錄），不需後端服務。

## Tech Stack

React 18 + TypeScript + Vite + shadcn/ui + Tailwind + Supabase + Upimg API

---

## 1. Book Spine Shelf（書脊書架）

### 視覺設計
- 深色背景（slate-900 或木紋 CSS gradient）
- 書本以書脊垂直排列，每層架 4-6 本（RWD）
- 書脊寬度 50-70px，高度 160-220px（根據書名長度微調）
- 書脊顏色根據第一個 tag 自動配色（預設 10 種色票）
- 書名垂直排列（writing-mode: vertical-rl）
- 層架底部有陰影/木紋邊線

### 書脊狀態
- `available`：正常顯示
- `lent_out`：半透明 + 「換出中」小標籤
- `returned`：正常顯示（歷史記錄留在 swap 表）

### 互動
- 點擊書脊 → 彈出 Dialog 顯示書的詳情
- 詳情包含：封面照片（有的話）、書名、作者、tags、狀態、操作按鈕
- 訪客可以看到「想換這本」（未來功能，先放 UI 不接邏輯）

### 書架頁頂部 Profile Card
- 使用者頭像 + 名稱
- 等級稱號 + 等級數字（如 Lv.5 書蟲）
- XP 進度條（到下一級）
- 統計：擁有 N 本 / 換過 N 次 / 徽章 N 個

---

## 2. Photo Upload（手機拍照上傳）

### 流程
1. AddBook 頁面新增「拍照/選照片」按鈕（`<input type="file" accept="image/*" capture="environment">`）
2. 選擇後前端壓縮（max 1200px 寬，JPEG 品質 0.8）
3. 上傳至 Upimg：`POST https://duk.tw/api/upload`（FormData）
4. 取得短網址 `https://duk.tw/xxx.jpg` 存入 `books.cover_url`

### 依賴
- 前端圖片壓縮：用 Canvas API（不需新 dependency）
- Upimg API：無需 auth，直接 POST multipart

---

## 3. Swap Status Tracking（換書狀態追蹤）

### 狀態機
```
book.status: 'available' | 'lent_out'

swap.status: 'active' | 'returned'
```

### 換書流程
1. 書主在 MyShelf 對某本書點「記錄換出」
2. 填寫：換給誰（選擇用戶或輸入名字）、備註
3. 建立 swap 記錄（status=active），書的 status 變成 lent_out
4. 書歸還時，書主點「已歸還」→ swap.status=returned，書 status 回 available

### DB 變更
- `books.status` enum：`available | lent_out`（移除 `swapped`，新增 `lent_out`）
- `swaps` 新增欄位：`status TEXT DEFAULT 'active'`（active | returned）
- `swaps` 新增欄位：`returned_at TEXT`（歸還時間）

---

## 4. Gamification（遊戲化系統）

### XP 規則
| 動作 | XP |
|------|-----|
| 上架一本書 | +10 |
| 換出一本書 | +30 |
| 歸還完成 | +20 |
| 擁有書達 10 本 | +50 (一次性) |

### 等級系統
| 等級 | 所需累積 XP | 稱號 |
|------|-----------|------|
| 1 | 0 | 換書新手 |
| 2 | 50 | 書架入門 |
| 3 | 150 | 愛書人 |
| 4 | 300 | 書蟲 |
| 5 | 500 | 換書達人 |
| 6 | 800 | 藏書家 |
| 7 | 1200 | 書癡 |
| 8 | 1800 | 移動圖書館 |
| 9 | 2500 | 換書傳說 |
| 10 | 3500 | 書神 |

### 徽章
| ID | 名稱 | 條件 |
|----|------|------|
| first_book | 第一本書 | 上架第一本書 |
| first_swap | 首次換書 | 完成第一次換出 |
| bookworm_10 | 十本藏書 | 書架達 10 本 |
| swapper_5 | 換書小能手 | 累計換出 5 次 |
| swapper_20 | 換書專家 | 累計換出 20 次 |
| returner | 有借有還 | 完成第一次歸還 |
| collector_30 | 大藏家 | 書架達 30 本 |

### 計算方式
- **前端即時計算**，不存 XP/Level 到 DB
- 從 books 和 swaps 表的記錄推算：書的數量、swap 次數、returned 次數
- 用 `useGameStats(profileId)` hook 統一計算
- 徽章判斷也是前端邏輯，基於同樣的數據

---

## 5. Tag 配色對照表

| Tag | 書脊顏色 |
|-----|---------|
| 小說 | amber-600 |
| 科技 | blue-600 |
| 文學 | emerald-600 |
| 商業 | violet-600 |
| 心理 | rose-500 |
| 歷史 | orange-700 |
| 藝術 | pink-500 |
| 漫畫 | cyan-500 |
| 語言 | teal-600 |
| 預設 | slate-500 |

---

## 6. 頁面變更摘要

| 頁面 | 變更 |
|------|------|
| `/user/:id` | 書脊書架 + Profile Card（等級/XP/徽章） |
| `/my` | 書脊書架 + 自己的 Profile Card + 管理按鈕 |
| `/my/add` | 新增拍照上傳封面功能 |
| `/swaps` | 改為有狀態的換書記錄（active/returned） |
| `/` (Browse) | 保持卡片式，但加上書主的等級徽章 |

---

## 7. 不做的事

- 不做即時通知（換書請求等）
- 不做排行榜（之後再說）
- 不做社群功能（留言、按讚）
- 不做後端 XP 計算（前端推算夠用）
- 不做書籍 ISBN 搜尋
