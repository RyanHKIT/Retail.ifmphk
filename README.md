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

瀏覽器開啟：**http://127.0.0.1:5174/retail**（Overview 總覽）

開發伺服器固定綁定 `127.0.0.1:5174`；靜態資源目錄為 repo 根目錄的 `public/`。

## 建置

```powershell
cd apps\web
npm run build
```

產出位於 `apps/web/dist/`。

## 文件

- 產品範圍：`docs/PRODUCT.md`

## 注意

- 請勿提交 `.env` 或任何密鑰。
- `_handoff_extract`、`_reference` 僅供開發參考，非執行必要檔案。
