# IFMP Retail（I.T. 零售示範）

獨立示範用前端：Vite + React，資料來自 `public/mock/retail` 的 mock JSON（無正式後端）。

## 需求

- Node.js **20** 或以上
- npm

## 本機開發

```powershell
cd apps\web
npm install
npm run dev
```

瀏覽器開啟：**http://127.0.0.1:5174/retail**（Overview 總覽）；簡報可加 **`?demo=1`** 顯示 golden-path 節拍與 sticky SpineNav。

開發伺服器固定綁定 `127.0.0.1:5174`；靜態資源目錄為 repo 根目錄的 `public/`。

## 建置與測試

```powershell
cd apps\web
npm ci
npm test
npm run build
```

產出位於 `apps/web/dist/`。本機預覽：`npm run preview -- --host 127.0.0.1 --port 5174`

## 對外展示

- 靜態部署與 `retail.ifmphk.com`：`docs/deploy-retail.ifmphk.com.md`
- I.T. 現場簡報腳本（Beat 0–8）：`docs/demo-script.md`

## 文件

- 產品範圍：`docs/PRODUCT.md`
- 設計規格：`docs/superpowers/specs/2026-09-04-ifmp-retail-demo-design.md`

## 注意

- 請勿提交 `.env` 或任何密鑰；mock 示範無需環境變數。
- `_handoff_extract`、`_reference` 僅供開發參考，非執行必要檔案。
