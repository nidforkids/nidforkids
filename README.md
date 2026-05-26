# NID For Kids 官方網站

> 編輯版面風格的單頁式網站，延續 NID Run Club 視覺語言。
> 班次與課程資料從 Google Sheets 自動同步——你改 Sheets，網站自動更新。

---

## 📁 檔案結構

```
nidforkids-site/
├── index.html              主頁面（單頁式）
├── style.css               共用樣式
├── course-detail.css       課程詳細頁專用樣式
├── script.js               JavaScript（含 Sheets 串接）
├── README.md               本檔案
│
├── courses/                ⭐️ 三個課程詳細頁
│   ├── kids-fitness.html       幼兒體適能班 4-6 歲
│   ├── kids-running-fun.html   兒童趣味跑步班 6-12 歲
│   └── kids-running-train.html 兒童跑步訓練班 6-12 歲
│
├── assets/
│   ├── logo-transparent.png    去背 logo（疊深色照片用）
│   ├── logo-on-light.png       白底 logo（白色區塊用）
│   ├── logo-white-bg.png       原始白底版
│   ├── logo-dark-bg.png        原始黑底版
│   ├── hero-1.jpg              主視覺照片
│   ├── hero-2.jpg
│   ├── hero-3.jpg
│   └── hero-4.jpg
│
└── _sheets-template/
    ├── courses.csv             Sheets「課程」分頁範本
    └── schedule.csv            Sheets「班次」分頁範本
```

### 頁面架構

**主頁（index.html）** — 給滑社群進來的人看
- Hero / 關於 / 課程簡介（含「查看詳情」按鈕）/ 班次 / FAQ / 聯絡

**課程詳細頁（courses/*.html）** — 給認真考慮的家長看
- Hero / 為誰設計 / 4 種能力 / 一堂課結構 / 課程資訊 / FAQ / CTA / 其他課程

---

## 🚀 部署到 GitHub Pages

### Step 1：上傳到 GitHub

```bash
# 在本機 nidforkids-site 資料夾內執行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/nidforkids-site.git
git push -u origin main
```

### Step 2：開啟 GitHub Pages

1. 進入 repo 頁面 → **Settings**
2. 左側選單找到 **Pages**
3. **Source** 選擇：**Deploy from a branch**
4. **Branch** 選擇：**main** / **/(root)**
5. 點 **Save**

幾分鐘後網站會上線在：
```
https://你的帳號.github.io/nidforkids-site/
```

### Step 3（之後）：綁定自有網域

買到網域後，回到 **Settings → Pages → Custom domain** 填入你的網域即可。
GitHub 也會自動配 HTTPS。

---

## 📊 連接 Google Sheets

這是讓你之後改班次「不用動程式碼」的關鍵步驟。

### Step 1：建立 Google Sheets

1. 開新的 Google Sheets，命名為「NID For Kids 課程資料」
2. 建立兩個分頁（左下角的 tab）：
   - 分頁 1：命名為 `courses`
   - 分頁 2：命名為 `schedule`

⚠️ **分頁名稱必須跟 `script.js` 裡的設定完全一樣**（大小寫敏感）

### Step 2：填入資料

打開 `_sheets-template/courses.csv` 和 `schedule.csv`，把內容複製貼上到對應分頁。
**第一列必須是標題列（欄位名稱）**，不要修改欄位名稱。

#### `courses` 分頁欄位說明

| 欄位 | 必填 | 說明 |
|---|---|---|
| order | ✓ | 顯示順序（1, 2, 3...） |
| name | ✓ | 課程名稱 |
| age | ✓ | 適合年齡（如：4 — 6 歲） |
| pillar | ✓ | 階段標籤（打基礎/養興趣/練實力） |
| tagline | ✓ | 一句話定位 |
| description | ✓ | 課程描述（1-3 句） |
| features |   | 賣點關鍵字，用逗號分隔（如：體能基礎,協調發展） |
| image |   | 圖片路徑（不填則用預設） |

#### `schedule` 分頁欄位說明

| 欄位 | 必填 | 說明 |
|---|---|---|
| location | ✓ | 場地名稱 |
| location_address |   | 場地區域（顯示在小字） |
| day | ✓ | 星期（週四、週五...） |
| time | ✓ | 時間（16:45） |
| course | ✓ | 課程名稱 |
| age | ✓ | 年齡標籤 |
| status | ✓ | 狀態文字（「招生中」、「剩 2 位」、「額滿」） |
| note |   | 內部備註（網站不顯示） |

**status 自動顏色判斷：**
- 含「招生中」→ 黃色
- 含「剩」→ 紅色（製造急迫感）
- 含「額滿」或「候補」→ 灰色

### Step 3：公開 Sheets

1. 點 Sheets 右上角 **「共用」**
2. 改為 **「知道連結的任何人」可檢視**
3. 複製網址，從中找出 Sheets ID：

```
https://docs.google.com/spreadsheets/d/【這一串就是 ID】/edit
```

### Step 4：把 ID 填入 script.js

打開 `script.js`，找到頂部的 CONFIG 區塊：

```javascript
const CONFIG = {
  SHEETS_ID: "",  // 👈 把 Sheets ID 貼這裡
  COURSES_SHEET: "courses",
  SCHEDULE_SHEET: "schedule",
};
```

把 ID 貼進雙引號裡，存檔，push 到 GitHub。

### Step 5：完成！

之後你只要在 Google Sheets 改資料 → **網站訪客 reload 就會看到最新內容**，不用碰任何程式碼。

---

## 🎨 換照片

把新照片放進 `assets/` 資料夾，檔名建議：
- `hero-1.jpg` 到 `hero-4.jpg`（Hero 區輪播）
- `course-elementary.jpg`、`course-running-fun.jpg`、`course-training.jpg`（給三堂課）

照片建議規格：
- **格式：** JPG（網頁載入快）
- **解析度：** 寬度 1600-2400px
- **檔案大小：** 控制在 500KB 以下（用 [TinyPNG](https://tinypng.com) 壓縮）

---

## 📝 改文案

### 不用碰程式碼的部分（建議優先）

✓ **主頁的課程簡介** → 改 Google Sheets `courses` 分頁
✓ **班次時段** → 改 Google Sheets `schedule` 分頁

### 需要改 HTML 的部分

✗ 主頁的 Hero 大標、品牌故事、FAQ 答案、聯絡資訊 → 改 `index.html`
✗ **課程詳細頁的內容**（適合誰、能力、結構、課程 FAQ）→ 改 `courses/xxx.html`

### 如何改課程詳細頁的內容？

每個 HTML 檔案我都加了註解標示「改這裡」的位置，例如：

```html
<!-- 改：適合誰的清單 ↓ -->
<ul class="who-list">
  <li>...</li>
</ul>
```

你只要找到註解，改下面的文字就好。**不要動 HTML 標籤（< > 那些）**，只改中文字。

如果不確定，丟回來給 Claude 幫你改也可以。

---

## 🔧 常見問題

### Q：Google Sheets 改完，網站沒更新？
A：因為瀏覽器有快取。試試：
1. 強制重新整理（Cmd/Ctrl + Shift + R）
2. Google Sheets 那邊有時候要等 5-10 分鐘 gviz API 才會更新

### Q：Sheets 沒辦法讀到？
A：檢查這幾點：
1. Sheets ID 是否正確
2. Sheets 是否設為「知道連結可檢視」
3. 分頁名稱是否完全一致（courses / schedule）
4. 開瀏覽器 DevTools 看 Console 有沒有錯誤訊息

### Q：手機版排版怪怪的？
A：CSS 已內建響應式設計，但如果某段不順可以跟我說，我來調。

### Q：要綁網域怎麼辦？
A：在 GitHub 的 Settings → Pages → Custom domain 填入。
也要記得到網域商那邊新增 DNS 紀錄：
- A 紀錄指向 GitHub 的 IP（185.199.108.153 等 4 個）
- 或 CNAME 指向 `你的帳號.github.io`

---

## 🆘 需要幫忙？

把問題、截圖、想改的方向丟回給 Claude，我會幫你處理。

---

**NID For Kids — Zero to Hero**
*A sister brand of NID Run Club*
