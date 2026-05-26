# 線上報名系統 — 設定教學

> 這份文件教你怎麼把 **Google Sheets + Google Apps Script** 連接起來，
> 讓官網的報名表單能自動把資料存進 Sheets、自動寄 Email 給家長。
>
> **完全免費、不用任何後端伺服器。**

---

## 整體流程

```
家長填官網表單 → JavaScript 把資料 POST 到 GAS
                                       ↓
                          GAS 做三件事：
                          ① 寫入 Sheets 報名分頁
                          ② 更新班次的「已報名」數
                          ③ 寄 Email 給家長 + 你
                                       ↓
                          家長看到「報名成功 + 匯款資訊」頁面
```

---

## STEP 1：建立 Google Sheets

1. 開新的 Google Sheets，命名為 **「NID For Kids 課程後台」**
2. 在底部建立兩個分頁（標籤）：
   - `courses`
   - `schedule`

   ⚠️ **分頁名稱必須是英文小寫，要跟程式中設定一致**

3. 從 `_sheets-template/courses.csv` 和 `schedule.csv` 複製內容到對應分頁。

   ✅ 第一列是標題列，不要修改
   ✅ 第二列開始填資料

4. `enrollments` 分頁不用建立——當第一筆報名送出時，GAS 會自動建好

---

## Schedule 欄位完整說明 ⭐️ 重要

班次的所有資訊（包括價格、堂數、優惠）都在 `schedule` 分頁裡，**每個班次可以獨立設定**。

| 欄位名稱 | 必填 | 範例 | 說明 |
|---|---|---|---|
| `location` | ✓ | 板橋第一運動場 | 場地名稱 |
| `location_address` | | 新北市板橋區 | 場地區域（顯示在小字） |
| `day` | ✓ | 週四 | 星期 |
| `time` | ✓ | 16:45 | 時間 |
| `course` | ✓ | 幼兒體適能班 | 課程名稱 |
| `age` | ✓ | 4-6 歲 | 年齡標籤 |
| `capacity` | ✓ | 6 | 名額上限 |
| `enrolled` | ✓ | 0 | 已報名人數（系統自動更新） |
| `status` | ✓ | 招生中 | 狀態文字 |
| **`price`** | ✓ | 450 | **單堂費用** |
| **`total_classes`** | ✓ | 12 | **一期堂數** |
| **`early_bird_price`** | | 400 | **早鳥單堂價（選填）** |
| **`early_bird_until`** | | 2026-06-30 | **早鳥截止日期（選填）** |
| **`discount_note`** | | 暑期早鳥 | **優惠說明（選填）** |
| `note` | | | 內部備註（網站不顯示） |

### 💡 不同班次可以有不同價格/堂數

例如：
- 兒童體適能班 平日場 → 450 元/堂、12 堂
- 兒童體適能班 週末場 → 500 元/堂、12 堂（場地較好較貴）
- 跑步訓練班 → 600 元/堂、16 堂（堂數較多）

每個班次獨立設定，互不干擾。

### 💡 早鳥優惠怎麼設？

範例：兒童趣味跑步班 6/30 前報名享早鳥價 400 元（原價 450 元）

| 欄位 | 值 |
|---|---|
| price | 450 |
| total_classes | 12 |
| early_bird_price | 400 |
| early_bird_until | 2026-06-30 |
| discount_note | 6/30 前報名享早鳥優惠 |

⚠️ **日期格式必須是 YYYY-MM-DD**（例如 `2026-06-30`）。
系統會自動判斷今天是否在優惠期間內：
- 今天 ≤ 6/30：顯示 400 元、套用早鳥
- 今天 > 6/30：自動切回原價 450 元

---

## STEP 2：開啟 Apps Script 編輯器

1. 在你的 Sheets 上方選單 **「擴充功能」→「Apps Script」**
2. 會跳到一個新分頁（Apps Script 編輯器）
3. 上方標題改成 **「NID For Kids 報名後台」**
4. 把編輯器中預設的 `myFunction()` 程式碼全部刪除
5. 打開 `_apps-script/Code.gs` 檔案
6. **整份檔案複製貼到 Apps Script 編輯器**
7. 點上方的「💾」儲存

---

## STEP 3：測試（很重要！）

1. 在 Apps Script 編輯器頂部選單，下拉選擇函式 → **`testEnroll`**
2. 找到這段並改成**你自己的 email**：
   ```javascript
   parent_email: "your-email@example.com",
   ```
3. 點上方 **「執行」** 按鈕
4. 第一次執行會跳出**授權視窗**，選你的 Google 帳號授權
   - 跳出「Google 尚未驗證此應用程式」→ 點「進階」→「前往 NID For Kids 報名後台」→「允許」
5. 看是否：
   - ✅ Sheets 出現了 `enrollments` 分頁（新自動建立）
   - ✅ `enrollments` 有一筆測試資料（含 早鳥標記、總金額 4800）
   - ✅ `schedule` 的「台北田徑場 / 週六 10:00 / 兒童趣味跑步班」的 `enrolled` 變成 1
   - ✅ 你的 email 收到報名確認信（含完整匯款資訊與早鳥優惠標記）

如果都成功，繼續到下一步。如果沒有，看下面「常見問題」。

⚠️ 測試完記得把 `enrollments` 那筆測試資料**刪掉**，並把 `schedule` 的 enrolled 改回 0。

---

## STEP 4：部署為 Web App

1. 在 Apps Script 編輯器右上角點 **「部署」→「新增部署作業」**
2. 點齒輪 ⚙️ →選 **「網頁應用程式」**
3. 填寫：
   - **說明**：填「NID For Kids 報名」（隨意）
   - **執行身分**：選「我」（你的 email）
   - **存取權**：選「所有人」⚠️ 一定要選這個
4. 點 **「部署」**
5. 完成後會顯示一個 URL，格式類似：
   ```
   https://script.google.com/macros/s/AKfycbz........../exec
   ```
6. **複製這個 URL** ⬅️ 等等要用到

---

## STEP 5：把 URL 貼到網站

1. 開啟 `nidforkids-site/enroll.js`
2. 找到這一行：
   ```javascript
   const GAS_WEBAPP_URL = "";
   ```
3. 把剛剛複製的 URL 貼進雙引號裡：
   ```javascript
   const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz........../exec";
   ```
4. 儲存
5. 把網站重新 push 到 GitHub（或重新上傳到你的主機）

---

## STEP 6：把 Sheets ID 也填到 script.js（為了同步班次資料）

1. 從 Sheets 網址複製 ID：
   ```
   https://docs.google.com/spreadsheets/d/【這一串就是 ID】/edit
   ```
2. 開啟 `nidforkids-site/script.js`
3. 找到：
   ```javascript
   const CONFIG = {
     SHEETS_ID: "",
   ```
4. 把 ID 貼進去：
   ```javascript
   SHEETS_ID: "1AbCdEfGhIjKlMnOpQrStUvWxYz_..."
   ```
5. 別忘了把 Sheets **設為「知道連結的任何人」可檢視**：
   - Sheets 右上「共用」→ 改為公開可檢視

---

## STEP 7：更新報名表單的價格選項

**這個步驟很重要**——當你新增/修改班次時，**還要在 `enroll.html` 的下拉選單裡**對應更新。

開啟 `enroll.html`，找到這段：

```html
<option value="台北田徑場 | 週六 10:00 | 兒童趣味跑步班"
        data-price="400"
        data-classes="12"
        data-original-price="450"
        data-early-bird="true">
  週六 10:00 ｜ 兒童趣味跑步班(6-12 歲) 🏷 早鳥優惠
</option>
```

修改規則：
- `data-price` = 該班次的單堂價格（早鳥期間就是早鳥價）
- `data-classes` = 一期堂數
- `data-original-price` = 早鳥情況下的原價（沒有早鳥不用填）
- `data-early-bird="true"` = 標記這個是早鳥優惠

> **未來會升級成自動：**
> 目前的設計，你改 Sheets 後也要改 enroll.html 的選項。
> 之後可以改成「報名頁也從 Sheets 動態載入選項」，那樣就完全不用改 HTML。
> 如果你想升級到這個版本，跟我說我幫你做。

---

## ✅ 完成！

現在你的官網報名系統運作流程：

1. 家長在官網填表單 → 按送出
2. 系統自動算出總費用（含早鳥優惠判斷）
3. 資料自動進 `enrollments` 分頁（含費用明細）
4. `schedule` 分頁的「enrolled」自動 +1
5. 家長收到含匯款資訊與優惠明細的 Email
6. 你也收到報名通知信
7. 家長看到「報名成功 + 匯款資訊」頁
8. 家長匯款後到 LINE 回報後 5 碼
9. 你在 LINE 確認，到 `enrollments` 分頁把該筆的「付款狀態」改成「已付款」

---

## 🔄 之後要新增/修改班次或價格

直接編輯 Google Sheets 的 `schedule` 分頁，**完全不用碰程式碼**：

- ➕ **加新班**：新增一列，填入所有欄位（含 price, total_classes）
- ✏️ **改價格**：修改 `price` 欄位
- 🏷 **加早鳥**：填 `early_bird_price` 與 `early_bird_until`
- ❌ **停止招生**：把 `status` 改成「額滿」或留空
- 🗑️ **刪除班次**：直接刪那一列

⚠️ 不要忘了**同步更新 enroll.html** 的下拉選單選項（除非你要升級到動態版本）

---

## ⚠️ 常見問題

### Q: GAS 執行時報錯「找不到分頁 schedule」
A: 確認你的 Sheets 分頁名稱**真的叫** `schedule`（小寫），不是「Schedule」或「班次」

### Q: 家長沒收到 Email
A: 可能原因：
- 對方的 Email 信箱寫錯
- 被丟進垃圾郵件夾（請對方檢查）
- 你的 Google 帳號當天寄信額度滿了（個人帳號每天 100 封，正常使用足夠）

### Q: 報名送出後 schedule 的 enrolled 沒有增加
A: 檢查 schedule 分頁是否有 `capacity` 和 `enrolled` 欄位，欄名要完全一致

### Q: 早鳥優惠沒有套用
A: 檢查：
- `early_bird_price` 有沒有比 `price` 低
- `early_bird_until` 的日期格式是否為 YYYY-MM-DD
- 今天的日期是否還在 `early_bird_until` 之前

### Q: 想要中斷某筆報名（家長沒匯款）
A: 兩件事：
1. 到 `enrollments` 分頁，刪掉那筆資料（或標記為「已取消」）
2. 到 `schedule` 分頁，把該班次的 `enrolled` 數字 -1

### Q: GAS 改了程式之後，網站表單還是用舊的怎麼辦？
A: 改完程式後，要**重新部署**：
- 部署 → 管理部署作業 → 編輯（鉛筆圖示） → 版本選「新版本」→ 部署
- ⚠️ Web App URL 不會變

### Q: 想看完整報名名單
A: 直接打開 Google Sheets 的 `enrollments` 分頁。

---

## 💡 進階：自動提醒未匯款的家長

如果你想做「24 小時提醒沒匯款的家長」這種自動化，可以再寫一個 GAS 定時觸發器。需要的話告訴我。
