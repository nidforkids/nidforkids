# 布布童鞋 Logo 替換說明

目前網站使用的是 hot-link(連到 babyview.tw 的伺服器)。

## 建議改成本地檔案

1. 到 https://babyview.tw/ 右鍵「圖片另存」首頁左上角的 logo
2. 命名為 `partner-babyview.png`
3. 放到 `assets/` 資料夾
4. 把 `index.html` 跟 3 個課程頁中的 `<img src="https://babyview.tw/image/catalog/LOGO/2311-topLOGO01.png">` 改成 `<img src="assets/partner-babyview.png">`(課程頁是 `../assets/`)

這樣 logo 載入會更快、也不會擔心布布童鞋換 URL 時你的網站圖片掉失。
